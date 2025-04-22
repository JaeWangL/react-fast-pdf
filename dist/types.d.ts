import { CSSProperties } from 'react';
type RenderParameters = {
    canvasContext: CanvasRenderingContext2D;
    viewport: PageViewport;
};
type RenderTask = {
    promise: Promise<void>;
    cancel: () => void;
};
type Page = {
    getViewport: ({ scale }: {
        scale: number;
    }) => PageViewport;
    render: (params: RenderParameters) => RenderTask;
};
type PageViewport = {
    height: number;
    width: number;
};
type ComponentStyles = {
    [key: string]: CSSProperties;
};
export type { PageViewport, ComponentStyles, Page, RenderParameters, RenderTask };
//# sourceMappingURL=types.d.ts.map