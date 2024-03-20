/*
Big thanks to @jessebofil for this
https://discord.com/channels/960281551428522045/960284327445418044/1209253688363716648
*/

import { Focusable, ModalPosition, GamepadButton, ScrollPanelGroup, gamepadDialogClasses, scrollPanelClasses, FooterLegendProps } from "decky-frontend-lib";
import { FC, useLayoutEffect, useRef, useState } from "react";

export interface ScrollableWindowProps extends FooterLegendProps {
    height: string;
    fadeAmount?: string;
    scrollBarWidth?: string;
    alwaysFocus?: boolean;
    noScrollDescription?: boolean;

    onActivate?: (e: CustomEvent) => void;
    onCancel?: (e: CustomEvent) => void;
}

const ScrollableWindow: FC<ScrollableWindowProps> = ({ height, fadeAmount, scrollBarWidth, alwaysFocus, noScrollDescription, children, actionDescriptionMap, ...focusableProps }) => {
    const fade = fadeAmount === undefined || fadeAmount === '' ? '10px' : fadeAmount;
    const barWidth = scrollBarWidth === undefined || scrollBarWidth === '' ? '4px' : scrollBarWidth;
    const [isOverflowing, setIsOverflowing] = useState(false);
    const scrollPanelRef = useRef<HTMLElement>();

    useLayoutEffect(() => {
        const { current } = scrollPanelRef;
        const trigger = () => {
            if (current) {
                const hasOverflow = current.scrollHeight > current.clientHeight;
                setIsOverflowing(hasOverflow);
            }
        };
        if (current) trigger();
    }, [children, height]);

    const panel = (
        <ScrollPanelGroup
            //@ts-ignore
            ref={scrollPanelRef} focusable={false} style={{ flex: 1, minHeight: 0 }}>
            <Focusable
                //@ts-ignore
                focusable={alwaysFocus || isOverflowing}
                key={'scrollable-window-focusable-element'}
                noFocusRing={true}
                actionDescriptionMap={Object.assign(noScrollDescription ? {} :
                    {
                        [GamepadButton.DIR_UP]: 'Scroll Up',
                        [GamepadButton.DIR_DOWN]: 'Scroll Down'
                    },
                    actionDescriptionMap ?? {}
                )}
                {...focusableProps}
            >
                {children}
            </Focusable>
        </ScrollPanelGroup>
    );

    return (
        <>
            <style>
                {`.modal-position-container .${gamepadDialogClasses.ModalPosition} {
			top: 0;
			bottom: 0;
			padding: 0;
		  }
		  .modal-position-container .${scrollPanelClasses.ScrollPanel}::-webkit-scrollbar {
			display: initial !important;
			width: ${barWidth};
		  }
		  .modal-position-container .${scrollPanelClasses.ScrollPanel}::-webkit-scrollbar-thumb {
			border: 0;
		  }`}
            </style>
            <div
                className='modal-position-container'
                style={{
                    position: 'relative',
                    height: height,
                    WebkitMask: `linear-gradient(to right , transparent, transparent calc(100% - ${barWidth}), white calc(100% - ${barWidth})), linear-gradient(to bottom, transparent, black ${fade}, black calc(100% - ${fade}), transparent 100%)`
                }}>
                {isOverflowing ? (
                    <ModalPosition key={'scrollable-window-modal-position'}>
                        {panel}
                    </ModalPosition>
                ) : (
                    <div className={`${gamepadDialogClasses.ModalPosition} ${gamepadDialogClasses.WithStandardPadding} Panel`} key={'modal-position'}>
                        {panel}
                    </div>
                )}
            </div>
        </>
    );
};

interface ScrollableWindowAutoProps extends Omit<ScrollableWindowProps, 'height'> {
    heightPercent?: number;
}

export const ScrollableWindowRelative: FC<ScrollableWindowAutoProps> = ({ heightPercent, ...props }) => {
    return (
        <div style={{ flex: 'auto' }}>
            <ScrollableWindow height={`${heightPercent ?? 100}%`} {...props} />
        </div>
    );
};