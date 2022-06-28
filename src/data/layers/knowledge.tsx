/**
 * @module
 * @hidden
 */
import { main } from "data/projEntry";
import { createCumulativeConversion, createIndependentConversion, createPolynomialScaling } from "features/conversion";
import { jsx } from "features/feature";
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
import { main as mainGame } from '../projEntry';
import Decimal from "util/bignum";
import { createMilestone } from "features/milestones/milestone";
import { computed, unref } from "vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { globalBus } from "game/events";
import { createBuyable } from "features/buyable";
import Spacer from "components/layout/Spacer.vue";
import Column from "components/layout/Column.vue";
import Row from "components/layout/Row.vue";

/**
 * @hidden
 */
const layer = createLayer("k", () => {
    const name = "Knowledge";
    const color = "#653719";

    const knowledge = createResource<DecimalSource>(0, "Knowledge");
    // const best = trackBest(knowledge);
    // const total = trackTotal(knowledge);
    const knowledgeResets = createResource<DecimalSource>(0);

    const reset = createReset(() => ({
        thingsToReset: (): Record<string, unknown>[] => [layer]
    }));

    const knowledgeMilestone1 = createMilestone(() => ({
        shouldEarn() {
            return Decimal.gte(knowledgeResets.value, 1);
        },
        display: {
            requirement: "1 Total Knowledge Resets",
            effectDisplay: `"I'll do this as many times as it takes."<br\>Automatically reset time for Knowledge.`
        }
    }));

    const milestones = [
        knowledgeMilestone1,
    ];

    const treeNode = createLayerTreeNode(() => ({
        layerID: "k",
        color,
        reset
    }));

    const tickSpeedIncreaseBuyable = createBuyable(() => ({
        resource: knowledge,
        cost() {
            let x = new Decimal(this.amount.value);
            //5*(1.7^(5^1.01))
            return Decimal.mul(5, Decimal.pow(1.6, x.pow(1.01)));
        },
        display() {
            const x = Decimal.max(this.amount.value, 1);
            const nextTickIncrease = Decimal.pow(1.1, x);
            return {
                title: `"I'm getting the hang of this time travel thing"`,
                description: `Time speed is multiplied by ${format(nextTickIncrease)}`
            }
        },
        style: {
            width: "256px",
            height: "176px"
        }
    }));

    const knowledgeIncreaseBuyable = createBuyable(() => ({
        resource: knowledge,
        cost () {
            const x = new Decimal(this.amount.value);
            // 10*(3^(2^1.1))
            return Decimal.mul(10, Decimal.pow(3, x.pow(1.1)));
        },
        display() {
            const x = Decimal.max(this.amount.value, 1);
            const nextTimeChange = Decimal.pow(1.2, x);
            const nextKnowledgeIncrease = x;
            return {
                title: "I just need a little more time to figure things out",
                description: `Time speed is divided by ${format(nextTimeChange)}, but base knowledge gain is increased by ${nextKnowledgeIncrease}.`
            }
        },
        style: {
            width: "256px",
            height: "176px"
        }
    }));

    const buyables = [
        tickSpeedIncreaseBuyable,
        knowledgeIncreaseBuyable,
    ];

    //  const tickUpgrade = createUpgrade(() => ({
    //      display: {
    //          title: "I need to fix this",
    //          description: "Time begins ticking down."
    //      },
    //      cost: 1,
    //      resource: mainGame.time
    //  }));

    //  const upgrades = [tickUpgrade];

    const knowledgeBoostUpgrade = createUpgrade(() => ({
        display: {
            title: `"I'm slowly piecing the answer together"`,
            description: "Multiply knowledge gain based on resets."
        },
        cost: 25,
        resource: knowledge
    }));

    const knowledgeBoostUpgrade2 = createUpgrade(() => ({
        display: {
            title: `"Perhaps if I do this, and then that."`,
            description: "Increase base knowledge gain based on number of purchased buyables."
        },
        cost: 1000,
        resource: knowledge
    }));

    const upgrades = [
        knowledgeBoostUpgrade,
        knowledgeBoostUpgrade2,
    ];

    const knowledgeGain = computed(() => {
        let gain = new Decimal(1);

        const knowledgeIncreaseBuyableAmount = new Decimal(knowledgeIncreaseBuyable.amount.value);
        if (knowledgeIncreaseBuyableAmount.gt(0)) {
            gain = gain.add(knowledgeIncreaseBuyableAmount);
        }

        if (unref(knowledgeBoostUpgrade2.bought.value)) {
            gain = Decimal.add(gain, Decimal.add(tickSpeedIncreaseBuyable.amount.value, knowledgeIncreaseBuyable.amount.value));
        }

        if (unref(knowledgeBoostUpgrade.bought.value)) {
            gain = gain.times(Decimal.times(2, Decimal.pow(knowledgeResets.value, 0.2))); // 2*(X^0.2)
        }

        return gain;
    });

    const conversion = createCumulativeConversion(() => ({
        scaling: {
            currentGain(conversion) {
                let amount: DecimalSource = unref(main.time.value);
                if (new Decimal(amount).lte(0)) {
                    return knowledgeGain.value;
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
        baseResource: main.time,
        gainResource: knowledge,
        roundUpCost: true,
        onConvert: (amountGained) => {
            knowledgeResets.value = Decimal.add(knowledgeResets.value, 1);
        },
    }));

    const oomps = trackOOMPS(knowledge, knowledgeGain);

    const resetButton = createResetButton(() => ({
        conversion,
        tree: main.tree,
        treeNode
    }));

    globalBus.on("update", diff => {
        if (knowledgeMilestone1.earned.value && Decimal.lte(main.time.value, 0)) {
            resetButton.onClick();
        }
    });

    const tabs = createTabFamily({
        ugradesTab: () => ({
            tab: createTab(() => ({
                display: jsx(() => (
                    <>
                        <MainDisplay resource={knowledge} color={color} />
                        {Decimal.gt(knowledgeGain.value, 0) ? <div>({format(knowledgeGain.value)} per reset)</div> : null}
                        {render(resetButton)}
                        <Spacer />
                        {renderRow(...upgrades)}
                        <Spacer />
                        <Row>
                            {renderCol(tickSpeedIncreaseBuyable)}
                            {renderCol(knowledgeIncreaseBuyable)}
                        </Row>
                        
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
                        You have reset time for Knowledge {format(knowledgeResets.value)} times.
                        {renderCol(...milestones)}
                    </>
                ))
            })),
            display: "Milestones"
        })
    });

    return {
        name,
        color,
        display: jsx(() => (
            <>
                {render(tabs)}
            </>
        )),
        treeNode,
        knowledge,
        knowledgeResets,
        knowledgeMilestone1,
        resetButton,
        conversion,
        reset,
        tabs,
        tickSpeedIncreaseBuyable,
        knowledgeIncreaseBuyable,
        oomps,
        knowledgeGain,
        knowledgeBoostUpgrade,
        knowledgeBoostUpgrade2,
    };
});

export default layer;
