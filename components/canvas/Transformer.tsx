"use client";

import type Konva from "konva";
import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";

interface TransformerProps {
	selectedIds: string[];
	onTransform?: (id: string, updates: any) => void;
}

export default function KonvaTransformer({
	selectedIds,
	onTransform,
}: TransformerProps) {
	const transformerRef = useRef<Konva.Transformer>(null);

	useEffect(() => {
		const transformer = transformerRef.current;
		if (!transformer) return;

		// Find all selected nodes on the stage
		const stage = transformer.getStage();
		if (!stage) return;

		const selectedNodes = selectedIds
			.map((id) => {
				const node = stage.findOne(`#${id}`);
				return node;
			})
			.filter(
				(node): node is Konva.Node => node !== null && node !== undefined,
			);

		if (selectedNodes.length === 0) {
			transformer.nodes([]);
			return;
		}

		// Attach transformer to selected nodes
		transformer.nodes(selectedNodes);
		transformer.getLayer()?.batchDraw();

		// Handle transform end (resize/rotate)
		const handleTransformEnd = () => {
			selectedNodes.forEach((node) => {
				if (!node) return;

				const id = node.id();
				const scaleX = node.scaleX();
				const scaleY = node.scaleY();

				// Check if this is an ellipse by looking at the node type
				const isEllipse = node.getClassName() === "Ellipse";
				const isRegularPolygon = node.getClassName() === "RegularPolygon"; // Triangle uses RegularPolygon

				// For ellipses, convert center coordinates back to top-left corner
				// For rectangles, use coordinates directly (they're already top-left)
				// For regular polygons (triangles), we need to convert from center+radius back to bounding box
				const updates = isEllipse
					? {
							x: node.x() - (node.width() * scaleX) / 2,
							y: node.y() - (node.height() * scaleY) / 2,
							width: node.width() * scaleX,
							height: node.height() * scaleY,
							rotation: node.rotation(),
						}
					: isRegularPolygon
						? {
								// For RegularPolygon, the node.x() and node.y() are center coordinates
								// We need to convert back to top-left bounding box coordinates
								x: (node as any).x() - (node as any).radius() * scaleX,
								y: (node as any).y() - (node as any).radius() * scaleY,
								width: (node as any).radius() * scaleX * 2,
								height: (node as any).radius() * scaleY * 2,
								rotation: node.rotation(),
							}
						: {
								x: node.x(),
								y: node.y(),
								width: node.width() * scaleX,
								height: node.height() * scaleY,
								rotation: node.rotation(),
							};

				// Reset scale to 1 after applying to width/height
				node.scaleX(1);
				node.scaleY(1);

				if (isRegularPolygon) {
					// For RegularPolygon, update radius instead of width/height
					// Also update the center position to match the new bounding box
					const newRadius = updates.width / 2;
					(node as any).radius(newRadius);
					(node as any).x(updates.x + updates.width / 2); // Convert back to center X
					(node as any).y(updates.y + updates.height / 2); // Convert back to center Y
				} else {
					node.width(updates.width);
					node.height(updates.height);
				}

				onTransform?.(id, updates);
			});
		};

		transformer.on("transformend", handleTransformEnd);

		return () => {
			transformer.off("transformend", handleTransformEnd);
		};
	}, [selectedIds, onTransform]);

	// Only render if there are selected objects
	if (selectedIds.length === 0) return null;

	return (
		<Transformer
			ref={transformerRef}
			rotateEnabled={true}
			enabledAnchors={[
				"top-left",
				"top-center",
				"top-right",
				"middle-left",
				"middle-right",
				"bottom-left",
				"bottom-center",
				"bottom-right",
			]}
			boundBoxFunc={(oldBox, newBox) => {
				// Minimum size constraints
				if (newBox.width < 10 || newBox.height < 10) {
					return oldBox;
				}
				return newBox;
			}}
		/>
	);
}
