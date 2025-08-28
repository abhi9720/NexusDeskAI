import * as React from 'react';
import { StickyNote, StickyNoteLink, ConnectorStyle } from '../types';

interface LinkRendererProps {
    link: StickyNoteLink;
    notes: StickyNote[];
    isSelected: boolean;
    onSelect: (position: {x: number, y: number}) => void;
    onStartDragEnd: (linkId: number, end: 'start' | 'end', e: React.MouseEvent) => void;
    draggingLinkEndInfo: { linkId: number; end: 'start' | 'end' } | null;
}

const getIntersectionPoint = (note: StickyNote, externalPoint: { x: number, y: number }): { x: number, y: number } => {
    const noteCenter = { x: note.position.x + note.size.width / 2, y: note.position.y + note.size.height / 2 };

    const dx = externalPoint.x - noteCenter.x;
    const dy = externalPoint.y - noteCenter.y;

    if (dx === 0 && dy === 0) return noteCenter;
    
    const halfWidth = note.size.width / 2;
    const halfHeight = note.size.height / 2;
    
    const xRatio = Math.abs(dx) / halfWidth;
    const yRatio = Math.abs(dy) / halfHeight;
    
    let pointX, pointY;

    if (xRatio > yRatio) {
        const sign = dx > 0 ? 1 : -1;
        pointX = noteCenter.x + sign * halfWidth;
        pointY = noteCenter.y + dy * (halfWidth / Math.abs(dx));
    } else {
        const sign = dy > 0 ? 1 : -1;
        pointY = noteCenter.y + sign * halfHeight;
        pointX = noteCenter.x + dx * (halfHeight / Math.abs(dy));
    }
    
    return { x: pointX, y: pointY };
};


const getPathData = (startPos: { x: number, y: number }, endPos: { x: number, y: number }, style: ConnectorStyle) => {
    switch (style) {
        case 'straight':
            return `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`;
        case 'elbow': {
            const midX = startPos.x + (endPos.x - startPos.x) / 2;
            return `M ${startPos.x} ${startPos.y} L ${midX} ${startPos.y} L ${midX} ${endPos.y} L ${endPos.x} ${endPos.y}`;
        }
        case 'curved':
        default: {
            const dx = endPos.x - startPos.x;
            const dy = endPos.y - startPos.y;
            let controlX1, controlY1, controlX2, controlY2;
            if (Math.abs(dx) > Math.abs(dy)) {
                controlX1 = startPos.x + dx * 0.5;
                controlY1 = startPos.y;
                controlX2 = endPos.x - dx * 0.5;
                controlY2 = endPos.y;
            } else {
                controlX1 = startPos.x;
                controlY1 = startPos.y + dy * 0.5;
                controlX2 = endPos.x;
                controlY2 = endPos.y - dy * 0.5;
            }
            return `M ${startPos.x} ${startPos.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endPos.x} ${endPos.y}`;
        }
    }
};

const LinkRenderer: React.FC<LinkRendererProps> = ({ link, notes, isSelected, onSelect, onStartDragEnd, draggingLinkEndInfo }) => {
    const [hoveredEnd, setHoveredEnd] = React.useState<'start' | 'end' | null>(null);

    const startNote = notes.find(n => n.id === link.startNoteId);
    const endNote = notes.find(n => n.id === link.endNoteId);

    // Determine the anchor points first (either the note's center or a free-floating position)
    const startAnchor = startNote 
        ? { x: startNote.position.x + startNote.size.width / 2, y: startNote.position.y + startNote.size.height / 2 } 
        : link.startPosition;
        
    const endAnchor = endNote 
        ? { x: endNote.position.x + endNote.size.width / 2, y: endNote.position.y + endNote.size.height / 2 } 
        : link.endPosition;
    
    if (!startAnchor || !endAnchor) {
        return null;
    }

    // Calculate the visual positions for the link endpoints. If a note is attached, this will be on its border.
    const startPos = startNote ? getIntersectionPoint(startNote, endAnchor) : startAnchor;
    const endPos = endNote ? getIntersectionPoint(endNote, startAnchor) : endAnchor;

    const pathData = getPathData(startPos, endPos, link.style);
    
    const midPoint = {
        x: startPos.x + (endPos.x - startPos.x) / 2,
        y: startPos.y + (endPos.y - startPos.y) / 2,
    };
    
    let markerEnd = 'none';
    if (link.endStyle === 'arrow') {
        markerEnd = 'url(#arrow)';
    } else if (link.endStyle === 'dot') {
        markerEnd = 'url(#dot)';
    }
    
    const isDraggingThisLink = draggingLinkEndInfo?.linkId === link.id;
    const isDraggingStart = isDraggingThisLink && draggingLinkEndInfo?.end === 'start';
    const isDraggingEnd = isDraggingThisLink && draggingLinkEndInfo?.end === 'end';
    const isHoveringStart = hoveredEnd === 'start';
    const isHoveringEnd = hoveredEnd === 'end';

    return (
        <g className="pointer-events-auto">
            <path
                d={pathData}
                stroke="transparent"
                strokeWidth="20"
                fill="none"
                onClick={(e) => { e.stopPropagation(); onSelect(midPoint); }}
                className="cursor-pointer"
            />
            <path
                d={pathData}
                stroke={isSelected || isDraggingThisLink ? 'hsl(var(--color-primary))' : 'currentColor'}
                strokeWidth={isSelected || isDraggingThisLink ? 3 : 2}
                fill="none"
                markerEnd={markerEnd}
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s', pointerEvents: 'none' }}
            />
             <circle
                cx={startPos.x}
                cy={startPos.y}
                r={isDraggingStart || isHoveringStart ? 10 : 8}
                className={`transition-all fill-white dark:fill-gray-700 stroke-2 cursor-move ${isDraggingStart || isHoveringStart ? 'stroke-primary' : 'stroke-gray-500 dark:stroke-gray-400'}`}
                onMouseDown={(e) => onStartDragEnd(link.id, 'start', e)}
                onMouseOver={() => setHoveredEnd('start')}
                onMouseOut={() => setHoveredEnd(null)}
            />
            <circle
                cx={endPos.x}
                cy={endPos.y}
                r={isDraggingEnd || isHoveringEnd ? 10 : 8}
                className={`transition-all fill-white dark:fill-gray-700 stroke-2 cursor-move ${isDraggingEnd || isHoveringEnd ? 'stroke-primary' : 'stroke-gray-500 dark:stroke-gray-400'}`}
                onMouseDown={(e) => onStartDragEnd(link.id, 'end', e)}
                onMouseOver={() => setHoveredEnd('end')}
                onMouseOut={() => setHoveredEnd(null)}
            />
        </g>
    );
};

export default LinkRenderer;
