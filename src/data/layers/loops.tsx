import { main } from "data/projEntry";
import { createCumulativeConversion, createIndependentConversion, createPolynomialScaling, softcap } from "features/conversion";
import { jsx, showIf, Visibility } from "features/feature";
import { createReset } from "features/reset";
import MainDisplay from "features/resources/MainDisplay.vue";
import { createResource, trackBest, trackOOMPS, trackTotal } from "features/resources/resource";
import { addTooltip } from "features/tooltips/tooltip";
import { createResourceTooltip } from "features/trees/tree";
import { createLayer } from "game/layers";
import { DecimalSource, format } from "util/bignum";
import { render, renderCol, renderRow } from "util/vue";
import { createLayerTreeNode, createResetButton } from "../common";
import { createUpgrade } from "features/upgrades/upgrade";
import Decimal from "util/bignum";
import { BaseMilestone, createMilestone, Milestone } from "features/milestones/milestone";
import { computed, unref } from "vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { globalBus } from "game/events";
import { createBuyable } from "features/buyable";
import Spacer from "components/layout/Spacer.vue";
import Row from "components/layout/Row.vue";
import machine from './machine';
import { createInfobox } from "features/infoboxes/infobox";

/**
 * @hidden
 */
const id = "l";
const layer = createLayer(id, () => {
    const name = "Loops";
    const color = "#4b0082";

    const loop = createResource<DecimalSource>(0, "Loop");
    // const best = trackBest(knowledge);
    // const total = trackTotal(knowledge);
    const loopResets = createResource<DecimalSource>(0);

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const loopsUnlockedMilestone = createMilestone(() => ({
        shouldEarn() {
            return Decimal.lte(machine.seconds.value, 0) || Decimal.gte(loopResets.value, 1);
        },
    }));

    const conversion = createCumulativeConversion(() => ({
        scaling: {
            currentGain(conversion) {
                if (Decimal.lte(machine.seconds.value, 0)) {
                    return loopGain.value;
                }

                return new Decimal(0);
            },
            currentAt(conversion) {
                return new Decimal(0);
            },
            nextAt(conversion) {
                return new Decimal(0);
            }
        },
        baseResource: machine.seconds,
        gainResource: loop,
        roundUpCost: true,
        onConvert: (amountGained) => {
            loopResets.value = Decimal.add(loopResets.value, 1);
        },
    }));

    const resetButton = createResetButton(() => ({
        conversion,
        tree: main.tree,
        treeNode
    }));

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        reset,
        visibility: () => showIf(loopsUnlockedMilestone.earned.value),
    }));

    const loopGain = computed(() => {
        let gain = new Decimal(1);

        // const knowledgeIncreaseBuyableAmount = new Decimal(knowledgeIncreaseBuyable.amount.value);
        // if (knowledgeIncreaseBuyableAmount.gt(0)) {
        //     gain = gain.add(knowledgeIncreaseBuyableAmount);
        // }

        // if (unref(knowledgeBoostUpgrade2.bought.value)) {
        //     gain = Decimal.add(gain, Decimal.pow(main.timePlayed.value, 0.1)); // X^0.1
        // }

        // if (unref(knowledgeBoostUpgrade3.bought.value)) {
        //     gain = Decimal.add(gain, Decimal.add(tickSpeedIncreaseBuyable.amount.value, knowledgeIncreaseBuyable.amount.value));
        // }

        // if (unref(knowledgeBoostUpgrade.bought.value)) {
        //     gain = gain.times(Decimal.times(2, Decimal.pow(knowledgeResets.value, 0.2))); // 2*(X^0.2)
        // }

        return gain;
    });

    const milestone1 = createMilestone(() => ({
        shouldEarn() {
            return Decimal.gte(loopResets.value, 1);
        },
        display: {
            requirement: "1 Total Loop Resets",
            effectDisplay: `"I'll do this as many times as it takes."<br\>Automate Loop resets.`
        }
    }));

    const milestone2 = createMilestone(() => ({
        shouldEarn() {
            return Decimal.gte(loopResets.value, 3);
        },
        display: {
            requirement: "3 Total Loop Resets",
            effectDisplay: `"Knowledge is Power, right?"<br\>Unlock a new layer.`
        }
    }));

    globalBus.on("update", diff => {
        if (milestone1.earned.value && Decimal.lte(machine.seconds.value, 0)) {
            resetButton.onClick();
        }
    });

    const milestones = [
        milestone1,
        milestone2,
    ];

    const loreBox = createInfobox(() => ({
        title: "Loops",
        titleStyle: { color: color },
        display: "Welp, that didn't seem to work. I guess there's nothing to do but try again.",
    }));

    const tabs = createTabFamily({
        ugradesTab: () => ({
            tab: createTab(() => ({
                display: jsx(() => (
                    <>
                        {render(loreBox)}

                        <Spacer />

                        <MainDisplay resource={loop} color={color} />
                        {Decimal.gt(loopGain.value, 0) ? <div>({format(loopGain.value)} per reset)</div> : null}
                        
                        {render(resetButton)}

                        <Spacer />

                        {/* <Row>
                            {upgrades.map(u => renderCol(u))}
                        </Row> */}

                        <Spacer />

                        {/* <Row>
                            {buyables.map(b => renderCol(b))}
                        </Row> */}
                        
                    </>
                ))
            })),
            display: "Upgrades",
            glowColor() {
                return "blue";
            }
        }),
        milestonesTab: () => ({
            tab: createTab(() => ({
                display: jsx(() => (
                    <>
                        You have Looped {format(loopResets.value)} times.
                        {renderCol(...milestones)}
                    </>
                ))
            })),
            display: "Milestones"
        })
    });

    return {
        treeNode,
        loop,
        loopResets,
        name,
        color,
        display: jsx(() => (
            <>
                {render(tabs)}
            </>
        )),
        milestone1,
        milestone2,
        loopsUnlockedMilestone,
        loreBox,
        conversion,
        loopGain,
        tabs,
        reset,
        resetButton,
    };
});

export default layer;