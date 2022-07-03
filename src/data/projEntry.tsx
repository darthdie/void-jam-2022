import Spacer from "components/layout/Spacer.vue";
import { jsx, showIf } from "features/feature";
import { createResource, trackBest, trackOOMPS, trackTotal } from "features/resources/resource";
import type { GenericTree } from "features/trees/tree";
import { branchedResetPropagation, createTree } from "features/trees/tree";
import { globalBus } from "game/events";
import { addLayer, GenericLayer, layers } from "game/layers";
import { createLayer } from "game/layers";
import type { PlayerData } from "game/player";
import player from "game/player";
import type { DecimalSource } from "util/bignum";
import Decimal, { format, formatTime } from "util/bignum";
import { render } from "util/vue";
import { computed, toRaw, unref, watch } from "vue";
import machine from "./layers/machine";
import knowledge from "./layers/knowledge";
import loops from "./layers/loops";
import { softcap } from "features/conversion";

/**
 * @hidden
 */
export const main = createLayer("main", () => {
    const timePlayed = createResource<DecimalSource>(0);
    const totalGameCompletions = createResource<DecimalSource>(0);

    const timeGain = computed(() => {
        let gain = new Decimal(0);
        
        if (machine.tickUpgrade.bought.value) {
            gain = gain.add(-1);
        }

        if (unref(knowledge.tickSpeedIncreaseBuyable.amount.value)) {
            gain = gain.times(Decimal.pow(1.1, knowledge.tickSpeedIncreaseBuyable.amount.value));
        }

        if (unref(knowledge.knowledgeIncreaseBuyable.amount.value)) {
            gain = gain.div(Decimal.pow(1.2, knowledge.knowledgeIncreaseBuyable.amount.value));
        }

        // if (unref(knowledge.upgrade4.bought.value)) {
        //     gain = gain.times(softcap(Decimal.pow(knowledge.knowledge.value, 0.05), 2, 0.002));
        // }

        return gain;
    });

    const tickspeed = computed(() => timeGain.value.abs());

    globalBus.on("update", diff => {
        if (Decimal.lte(machine.seconds.value, 0)) {
            machine.seconds.value = 0;
        } else {
            machine.seconds.value = Decimal.add(machine.seconds.value, Decimal.times(timeGain.value, diff));
        }

        timePlayed.value = Decimal.add(timePlayed.value, Decimal.times(1, diff));
    });

    const oomps = trackOOMPS(machine.seconds, timeGain);

    const tree = createTree(() => {
        let branches = computed(() => {
            let list = [];
            const loopsUnlocked = unref(loops.loopsUnlockedMilestone.earned.value) && loops.treeNode;
            const knowledgeUnlocked = unref(knowledge.knowledgeUnlockedMilestone.earned.value) && knowledge.treeNode;

            if (loopsUnlocked) {
                list.push({
                    startNode: machine.treeNode,
                    endNode: loops.treeNode,
                });
            }

            if (knowledgeUnlocked) {
                list.push({
                    startNode: loops.treeNode,
                    endNode: knowledge.treeNode,
                });
            }

            return list;
        });

        return {
            nodes: [[machine.treeNode], [loops.treeNode, knowledge.treeNode]],
            branches: branches,
            onReset() {
                machine.seconds.value = toRaw(this.resettingNode.value) === toRaw(machine.treeNode) ? 0 : 10;
                machine.best.value = machine.seconds.value;
                machine.total.value = machine.seconds.value;
            },
            resetPropagation: branchedResetPropagation
        };
    }) as GenericTree;

    // watch(seconds, () => {
    //     if (Decimal.lte(seconds.value, 0) && !layers[knowledge.id]) {
    //         addLayer(knowledge, player);
    //     }
    // });

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
                    {Decimal.lt(machine.seconds.value, "1e1000") ? <span>You have </span> : null}
                    <h2>{format(machine.seconds.value)}</h2>
                    {Decimal.lt(machine.seconds.value, "1e1e6") ? <span> seconds left</span> : null}
                </div>
                <div>
                    Time is ticking down at a rate of: {format(tickspeed.value)}/s.
                </div>
                <Spacer />
                {render(tree)}
            </>
        )),
        oomps,
        tree,
        timePlayed,
        totalGameCompletions,
    };
});

export const getInitialLayers = (
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    player: Partial<PlayerData>
): Array<GenericLayer> => [main, machine, loops, knowledge];

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
