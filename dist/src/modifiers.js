"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveNode = moveNode;
exports.addNode = addNode;
exports.updateText = updateText;
exports.removeNode = removeNode;
/**
 * 1. Move a node relative to its current position (dx, dy)
 */
function moveNode(graph, nodeId, dx, dy) {
    const node = graph.nodes[nodeId];
    // Guard Clause: Check if node exists
    if (!node) {
        console.error(`[Error] Node "${nodeId}" does not exist.`);
        return false;
    }
    // Guard Clause: Don't move locked nodes
    if (node.locked) {
        console.warn(`[Warning] Node "${nodeId}" is locked and cannot be moved.`);
        return false;
    }
    // Mutate position in memory
    node.transform.x += dx;
    node.transform.y += dy;
    console.log(`[Success] Moved "${node.name}" to X:${node.transform.x}, Y:${node.transform.y}`);
    return true;
}
/**
 * 2. Add a new node to the canvas graph
 */
function addNode(graph, newNode) {
    // Guard Clause: Prevent duplicate IDs
    if (graph.nodes[newNode.id]) {
        console.error(`[Error] Node with ID "${newNode.id}" already exists.`);
        return false;
    }
    // 1. Add to the flat O(1) map
    graph.nodes[newNode.id] = newNode;
    // 2. Add to rootNodeIds array to control rendering z-index (top layer)
    graph.rootNodeIds.push(newNode.id);
    console.log(`[Success] Added new node "${newNode.name}" (ID: ${newNode.id})`);
    return true;
}
/**
 * 3. Update text content for text_block nodes
 */
function updateText(graph, nodeId, newText) {
    const node = graph.nodes[nodeId];
    if (!node) {
        console.error(`[Error] Node "${nodeId}" not found.`);
        return false;
    }
    if (node.type !== 'text_block') {
        console.error(`[Error] Node "${nodeId}" is not a text_block.`);
        return false;
    }
    // Cast node.data safely to TextBlockData
    node.data.text = newText;
    console.log(`[Success] Updated text for "${node.name}" to: "${newText}"`);
    return true;
}
/**
 * 4. Remove a node from the graph
 */
function removeNode(graph, nodeId) {
    if (!graph.nodes[nodeId]) {
        console.error(`[Error] Node "${nodeId}" does not exist.`);
        return false;
    }
    // 1. Remove from rootNodeIds array
    graph.rootNodeIds = graph.rootNodeIds.filter(id => id !== nodeId);
    // 2. Delete from flat map
    delete graph.nodes[nodeId];
    console.log(`[Success] Deleted node "${nodeId}"`);
    return true;
}
