/**
 * @module
 * @hidden
 */
import { main } from "data/projEntry";
import { createCumulativeConversion, createPolynomialScaling } from "features/conversion";
import { jsx, showIf } from "features/feature";
import { createReset } from "features/reset";
import MainDisplay from "features/resources/MainDisplay.vue";
import { createResource, trackBest, trackTotal } from "features/resources/resource";
import { addTooltip } from "features/tooltips/tooltip";
import { createResourceTooltip } from "features/trees/tree";
import { createLayer } from "game/layers";
import { DecimalSource, format } from "util/bignum";
import { render, renderRow } from "util/vue";
import { createLayerTreeNode, createResetButton } from "../common";
import { createUpgrade } from "features/upgrades/upgrade";
// import {main as mainGame} from '../projEntry';
import Decimal from "util/bignum";
import { createInfobox } from "features/infoboxes/infobox";
import { unref, watch } from "vue";
import { createMilestone } from "features/milestones/milestone";
import knowledgea from './knowledge';

/**
 * @hidden
 */
const id = "m";
const layer = createLayer(id, () => {
    const name = "Machine";
    const color = "#4BDC13";

    const seconds = createResource<DecimalSource>(10, "seconds");
    const best = trackBest(seconds);
    const total = trackTotal(seconds);

    // const conversion = createCumulativeConversion(() => ({
    //     scaling: createPolynomialScaling(10, 0.5),
    //     baseResource: main.points,
    //     gainResource: points,
    //     roundUpCost: true
    // }));

    // const reset = createReset(() => ({
    //     thingsToReset: (): Record<string, unknown>[] => [layer]
    // }));

    const loreBox = createInfobox(() => ({
        title: "The Beginning - The Machine",
        titleStyle: { color: color },
        display: "I've made a huge mistake, and I must rectify it.<br>I believe I've found a way to modify the time machine in order to maintain a time loop so that I can find The Answer.<br/>Now, to activate the machine.",
        // bodyStyle: { backgroundColor: "#0000EE" },
        // color: "rgb(75, 220, 19)",
        // title
    }));

    const treeNode = createLayerTreeNode(() => ({
        layerID: id,
        color,
        // reset
    }));

    const tickUpgrade = createUpgrade(() => ({
        display: {
            title: `Activate the machine.`,
            description: "Time begins ticking down."
        },
        cost: 0,
        resource: seconds
    }));

    const upgrades = [tickUpgrade];

    // const resetButton = createResetButton(() => ({
    //     conversion,
    //     tree: main.tree,
    //     treeNode
    // }));

    return {
        name,
        color,
        display: jsx(() => (
            <>
                {render(loreBox)}
                <div>
                    {Decimal.lt(seconds.value, "1e1000") ? <span>You have </span> : null}
                    <h2>{format(seconds.value)}</h2>
                    {Decimal.lt(seconds.value, "1e1e6") ? <span> seconds left</span> : null}
                </div>
                {renderRow(...upgrades)}
            </>
        )),
        treeNode,
        tickUpgrade,
        loreBox,
        seconds,
        best,
        total
    };
});

export default layer;
