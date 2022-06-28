import Spacer from "components/layout/Spacer.vue";
import { jsx } from "features/feature";
import { createResource, trackBest, trackOOMPS, trackTotal } from "features/resources/resource";
import type { GenericTree } from "features/trees/tree";
import { branchedResetPropagation, createTree } from "features/trees/tree";
import { globalBus } from "game/events";
import type { GenericLayer } from "game/layers";
import { createLayer } from "game/layers";
import type { PlayerData } from "game/player";
import player from "game/player";
import type { DecimalSource } from "util/bignum";
import Decimal, { format, formatTime } from "util/bignum";
import { render } from "util/vue";
import { computed, toRaw, unref } from "vue";
import travel from "./layers/time";
import knowledge from "./layers/knowledge";

/**
 * @hidden
 */
export const main = createLayer("main", () => {
    const seconds = createResource<DecimalSource>(10, "seconds");
    const best = trackBest(seconds);
    const total = trackTotal(seconds);

    const timeGain = computed(() => {
        let gain = new Decimal(0);
        
        if (travel.tickUpgrade.bought.value) {
            gain = gain.add(-1);
        }

        if (unref(knowledge.tickSpeedIncreaseBuyable.amount.value)) {
            gain = gain.times(Decimal.pow(1.1, knowledge.tickSpeedIncreaseBuyable.amount.value));
        }

        if (unref(knowledge.knowledgeIncreaseBuyable.amount.value)) {
            gain = gain.div(Decimal.pow(1.2, knowledge.knowledgeIncreaseBuyable.amount.value));
        }

        return gain;
    });

    const tickspeed = computed(() => timeGain.value.abs());

    globalBus.on("update", diff => {
        if (Decimal.lte(seconds.value, 0)) {
            seconds.value = 0;
        } else {
            seconds.value = Decimal.add(seconds.value, Decimal.times(timeGain.value, diff));
        }
    });

    const oomps = trackOOMPS(seconds, timeGain);

    const tree = createTree(() => ({
        nodes: [[travel.treeNode], [knowledge.treeNode]],
        branches: [
            {
                startNode: travel.treeNode,
                endNode: knowledge.treeNode,
            }
        ],
        onReset() {
            seconds.value = toRaw(this.resettingNode.value) === toRaw(travel.treeNode) ? 0 : 10;
            best.value = seconds.value;
            total.value = seconds.value;
        },
        resetPropagation: branchedResetPropagation
    })) as GenericTree;

    knowledge.kno

    return {
        name: "Tree",
        links: tree.links,
        display: jsx(() => (
            <>
                {player.devSpeed === 0 ? <div>Game Paused</div> : null}
                {player.devSpeed && player.devSpeed !== 1 ? (
                    <div>Dev Speed: {format(player.devSpeed)}x</div>
                ) : null}
                {player.offlineTime ? (
                    <div>Offline Time: {formatTime(player.offlineTime)}</div>
                ) : null}
                <div>
                    {Decimal.lt(seconds.value, "1e1000") ? <span>You have </span> : null}
                    <h2>{format(seconds.value)}</h2>
                    {Decimal.lt(seconds.value, "1e1e6") ? <span> seconds left</span> : null}
                </div>
                <div>
                    Time is ticking down at a rate of: {format(tickspeed.value)}/s.
                </div>
                <Spacer />
                {render(tree)}
            </>
        )),
        time: seconds,
        best,
        total,
        oomps,
        tree
    };
});

export const getInitialLayers = (
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    player: Partial<PlayerData>
): Array<GenericLayer> => [main, travel, knowledge];

export const hasWon = computed(() => {
    return false;
});

/* eslint-disable @typescript-eslint/no-unused-vars */
export function fixOldSave(
    oldVersion: string | undefined,
    player: Partial<PlayerData>
    // eslint-disable-next-line @typescript-eslint/no-empty-function
): void {}
/* eslint-enable @typescript-eslint/no-unused-vars */
