import React, { type CSSProperties } from 'react';
type Props = {
    index: number;
    style: CSSProperties;
    data: {
        pageWidth: number;
        estimatedPageHeight: number;
        calculatePageHeight: (pageIndex: number) => number;
        getDevicePixelRatio: (width: number, height: number) => number | undefined;
        numPages: number;
        containerHeight: number;
    };
};
declare function PageRenderer({ index, style, data }: Props): React.JSX.Element;
declare namespace PageRenderer {
    var displayName: string;
}
declare const _default: React.MemoExoticComponent<typeof PageRenderer>;
export default _default;
//# sourceMappingURL=PageRenderer.d.ts.map