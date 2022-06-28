/**
 * @module
 * @hidden
 */
import { main } from "data/projEntry";
import { createCumulativeConversion, createPolynomialScaling } from "features/conversion";
import { jsx } from "features/feature";
import { createReset } from "features/reset";
import MainDisplay from "features/resources/MainDisplay.vue";
import { createResource } from "features/resources/resource";
import { addTooltip } from "features/tooltips/tooltip";
import { createResourceTooltip } from "features/trees/tree";
import { createLayer } from "game/layers";
import { DecimalSource, format } from "util/bignum";
import { render, renderRow } from "util/vue";
import { createLayerTreeNode, createResetButton } from "../common";
import { createUpgrade } from "features/upgrades/upgrade";
import {main as mainGame} from '../projEntry';
import Decimal from "util/bignum";

/**
 * @hidden
 */
const layer = createLayer("t", () => {
    const name = "Time";
    const color = "#4BDC13";

    // const conversion = createCumulativeConversion(() => ({
    //     scaling: createPolynomialScaling(10, 0.5),
    //     baseResource: main.points,
    //     gainResource: points,
    //     roundUpCost: true
    // }));

    // const reset = createReset(() => ({
    //     thingsToReset: (): Record<string, unknown>[] => [layer]
    // }));

    const treeNode = createLayerTreeNode(() => ({
        layerID: "t",
        color,
        // reset
    }));

    const tickUpgrade = createUpgrade(() => ({
        display: {
            title: `"I need to fix this"`,
            description: "Time begins ticking down."
        },
        cost: 0,
        resource: mainGame.time
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
                <div>
                    {Decimal.lt(mainGame.time.value, "1e1000") ? <span>You have </span> : null}
                    <h2>{format(mainGame.time.value)}</h2>
                    {Decimal.lt(mainGame.time.value, "1e1e6") ? <span> seconds left</span> : null}
                </div>
                {renderRow(...upgrades)}
            </>
        )),
        treeNode,
        tickUpgrade,
    };
});

export default layer;
