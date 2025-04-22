import {RenderParameters} from 'pdfjs-dist/types/src/display/api';
import {CSSProperties} from 'react';

type RenderTask = {
    promise: Promise<void>;
    cancel: () => void;
};

type Page = {
    getViewport: ({scale}: {scale: number}) => PageViewport;
    render: (params: RenderParameters) => RenderTask;
};

type PDFDocument = {
    numPages: number;
    getPage: (pageNumber: number) => Promise<Page>;
};

type PageViewport = {
    height: number;
    width: number;
};

type ComponentStyles = {
    [key: string]: CSSProperties;
};

export type {PDFDocument, PageViewport, ComponentStyles, Page, RenderParameters, RenderTask};
