// @ts-ignore
/**
 * @module
 * @hidden
 */
import { main } from "data/projEntry";
import { addSoftcap, createCumulativeConversion, createIndependentConversion, createPolynomialScaling, softcap } from "features/conversion";
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
import { createMilestone } from "features/milestones/milestone";
import { computed, unref } from "vue";
import { createTabFamily } from "features/tabs/tabFamily";
import { createTab } from "features/tabs/tab";
import { globalBus } from "game/events";
import { createBuyable } from "features/buyable";
import Spacer from "components/layout/Spacer.vue";
import Row from "components/layout/Row.vue";
import machine from './machine';
import loops from "./loops";
import { createInfobox } from "features/infoboxes/infobox";
import { createAdditiveModifier, createMultiplicativeModifier, createSequentialModifier } from "game/modifiers";

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

    const milestone1 = createMilestone(() => ({
        shouldEarn() {
            return Decimal.gte(knowledgeResets.value, 500);
        },
        display: {
            requirement: "500 Total Knowledge Resets",
            effectDisplay: `"Adapting to new information."<br\>Unlock a new knowledge upgrade.`
        }
    }));

    // const milestone2 = createMilestone(() => ({
    //     shouldEarn() {
    //         return Decimal.gte(knowledgeResets.value, 500);
    //     },
    //     display: {
    //         requirement: "20 Total Knowledge Resets",
    //         effectDisplay: `"Adapting to new information."<br\>Unlock 3 new knowledge upgrades.`
    //     }
    // }));

    const milestones = [
        milestone1,
    ];

    const knowledgeUnlockedMilestone = createMilestone(() => ({
        shouldEarn() {
            return Decimal.gte(loops.loopResets.value, 3) || Decimal.gte(knowledgeResets.value, 1);
        },
    }));

    const treeNode = createLayerTreeNode(() => ({
        layerID: "k",
        color,
        reset,
        visibility: () => showIf(knowledgeUnlockedMilestone.earned.value),
    }));

    const unlockBuyablesUpgrade = createUpgrade(() => ({
        display: {
            title: `"Recollection"`,
            description: "Unlock 2 new Knowledge buyables."
        },
        cost: 10,
        resource: knowledge
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
        },
        visibility: () => showIf(unlockBuyablesUpgrade.bought.value),
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
        },
        visibility: () => showIf(unlockBuyablesUpgrade.bought.value),
    }));

    const buyables = [
        tickSpeedIncreaseBuyable,
        knowledgeIncreaseBuyable,
    ];

    const knowledgeBoostUpgrade = createUpgrade(() => ({
        display: computed(() => {
            const boost = Decimal.pow(main.timePlayed.value, 0.1);
            
            return {
                title: `"I'm slowly piecing the answer together"`,
                description: "Multiply knowledge gain based on resets.",
                effectDisplay: `+${format(boost)}`
            }
        }),
        cost: 25,
        resource: knowledge
    }));

    const knowledgeBoostUpgrade2 = createUpgrade(() => ({
        display: computed(() => {
            const description = "Increase base knowledge gain based on total time played.";
            const boost = format(Decimal.add(tickSpeedIncreaseBuyable.amount.value, knowledgeIncreaseBuyable.amount.value));

            return {
                title: `"My perception of time is getting weird."`,
                description,
                effectDisplay: `+${format(boost)}`,
            }
        }),
        cost: 1000,
        resource: knowledge
    }));

    const knowledgeBoostUpgrade3 = createUpgrade(() => {
        const description = "Increase base knowledge gain based on number of purchased buyables.";
        const boost = Decimal.times(2, Decimal.pow(knowledgeResets.value, 0.2));

        return {
            display: {
                title: `"Getting into the flow of things."`,
                description,
                effectDisplay: `x${format(boost)}`
            },
            cost: 1e5,
            resource: knowledge,
            visibility: () => showIf(milestone1.earned.value),
        };
    });

    // const upgrade5 = createUpgrade(() => {
    //     const description = "Loops multiply knowledge gain.";
    //     const boost = Decimal.times(2, Decimal.pow(knowledgeResets.value, 0.2));

    //     return {
    //         display: {
    //             title: `"Getting into the flow of things."`,
    //             description,
    //             effectDisplay: `x${format(boost)}`
    //         },
    //         cost: 1e5,
    //         resource: knowledge,
    //         visibility: () => showIf(milestone1.earned.value),
    //     };
    // });

    // const upgrade4 = createUpgrade(() => {
    //     const description = "Multiply time speed based on unspent knowledge. (";

    //     const boost = softcap(Decimal.pow(knowledge.value, 0.05), 2, 0.002);

    //     return {
    //         display: {
    //             title: `"Rinse and repeat."`,
    //             description,
    //             effectDisplay: `x${format(boost)}`
    //         },
    //         cost: 1e6,
    //         resource: knowledge,
    //         visibility: () => showIf(knowledgeMilestone2.earned.value)
    //     }
    // })

    const upgradeRows = [
        [
            unlockBuyablesUpgrade,
            knowledgeBoostUpgrade,
            knowledgeBoostUpgrade2,
        ],
        [
            knowledgeBoostUpgrade3,
        ]
    ]

    const knowledgeGain = computed(() => {
        let gain = new Decimal(1);

        const knowledgeIncreaseBuyableAmount = new Decimal(knowledgeIncreaseBuyable.amount.value);
        if (knowledgeIncreaseBuyableAmount.gt(0)) {
            gain = gain.add(knowledgeIncreaseBuyableAmount);
        }

        if (unref(knowledgeBoostUpgrade2.bought.value)) {
            gain = Decimal.add(gain, Decimal.pow(main.timePlayed.value, 0.1)); // X^0.1
        }

        if (unref(knowledgeBoostUpgrade3.bought.value)) {
            gain = Decimal.add(gain, Decimal.add(tickSpeedIncreaseBuyable.amount.value, knowledgeIncreaseBuyable.amount.value));
        }

        if (unref(knowledgeBoostUpgrade.bought.value)) {
            gain = gain.times(Decimal.times(2, Decimal.pow(knowledgeResets.value, 0.2))); // 2*(X^0.2)
        }

        return gain;
    });

    const conversion = createCumulativeConversion(() => ({
        scaling: createPolynomialScaling(5, 0.5),
        baseResource: loops.loop,
        gainResource: knowledge,
        roundUpCost: true,
        onConvert: (amountGained) => {
            knowledgeResets.value = Decimal.add(knowledgeResets.value, 1);
        },
        gainModifier: createSequentialModifier(
            createAdditiveModifier(computed(() => knowledgeIncreaseBuyable.amount.value), undefined, computed(() => Decimal.gt(knowledgeIncreaseBuyable.amount.value, 0))),
            createAdditiveModifier(computed(() => Decimal.pow(main.timePlayed.value, 0.1)), undefined, computed(() => knowledgeBoostUpgrade2.bought.value)),
            createAdditiveModifier(computed(() => Decimal.add(tickSpeedIncreaseBuyable.amount.value, knowledgeIncreaseBuyable.amount.value)), undefined, computed(() =>  knowledgeBoostUpgrade3.bought.value)),
            createMultiplicativeModifier(computed(() => Decimal.times(2, Decimal.pow(knowledgeResets.value, 0.2))), undefined, computed(() => knowledgeBoostUpgrade.bought.value)),
        )
    }));

    const oomps = trackOOMPS(knowledge, knowledgeGain);

    const resetButton = createResetButton(() => ({
        conversion,
        tree: main.tree,
        treeNode,
        canClick: computed(() => Decimal.gte(loops.loop.value, 5)),
    }));

    // globalBus.on("update", diff => {
    //     if (knowledgeMilestone1.earned.value && Decimal.lte(machine.seconds.value, 0)) {
    //         resetButton.onClick();
    //     }
    // });

    const loreBox = createInfobox(() => ({
        title: "Knowledge",
        titleStyle: { color: color },
        display: "No luck yet, but if I pay attention I think I can figure out a solution.",
    }));

    const loopBoost = computed(() => {
        // let baseAmount: DecimalSource = unref(conversion.baseResource.value);
        // if (conversion.costModifier) {
        //     baseAmount = conversion.costModifier.apply(baseAmount);
        // }
        // if (Decimal.lt(baseAmount, unref(processedBase))) {
        //     return 0;
        // }

        // const gain = Decimal.div(baseAmount, unref(processedBase)).pow(
        //     unref(processedExponent)
        // );

        // if (gain.isNan()) {
        //     return new Decimal(0);
        // }
        // return gain;

        //1 + ((2 / 2) ^ 0.5)
        return softcap(
            softcap(Decimal.add(1, Decimal.div(knowledge.value, 2).pow(0.7)), 25, 0.3),
            500,
            0.1
        );

        // return addSoftcap(createPolynomialScaling(3, 0.3), 3, 0.3).currentGain();
        // return softcap(Decimal.mul(knowledge.value, 0.01), 2, 0.5);
    });

    const tabs = createTabFamily({
        ugradesTab: () => ({
            tab: createTab(() => ({
                display: jsx(() => (
                    <>
                        <MainDisplay resource={knowledge} color={color} />
                        <div>
                            {<span>Which is boosting Loop gain by: x{format(loopBoost.value)}</span>}
                        </div>
                        {/* {Decimal.gt(knowledgeGain.value, 0) ? <div>({format(knowledgeGain.value)} per reset)</div> : null} */}
                        
                        {render(resetButton)}
                        <div>
                            {<span>You have {format(loops.loop.value)} Loop.</span>}
                        </div>

                        <Spacer />

                        {upgradeRows.map(col => (<Row>{col.map(u => renderCol(u))}</Row>))}

                        <Spacer />

                        <Row>
                            {buyables.map(b => renderCol(b))}
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
        // knowledgeMilestone1,
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
        knowledgeBoostUpgrade3,
        knowledgeUnlockedMilestone,
        loreBox,
        knowledgeMilestone2: milestone1,
        unlockBuyablesUpgrade,
        // upgrade4,
        loopBoost,
    };
});

export default layer;
