// eslint-disable-next-line import/extensions
import pdfWorkerSource from 'pdfjs-dist/build/pdf.worker.min.mjs';
// eslint-disable-next-line import/extensions
import pdfWorkerLegacySource from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import React, {CSSProperties, forwardRef, memo, ReactNode, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState} from 'react';
import times from 'lodash/times';
import {ListOnItemsRenderedProps, VariableSizeList as List} from 'react-window';
import {Document, pdfjs} from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import type {PageViewport, PDFDocument} from './types';
import {pdfPreviewerStyles as styles} from './styles';
import PDFPasswordForm, {type PDFPasswordFormProps} from './PDFPasswordForm';
import PageRenderer from './PageRenderer';
import {DEFAULT_DOCUMENT_OPTIONS, DEFAULT_EXTERNAL_LINK_TARGET, LARGE_SCREEN_SIDE_SPACING, PAGE_BORDER, PDF_PASSWORD_FORM_RESPONSES} from './constants';
import {isMobileSafari, isModernSafari, setListAttributes} from './helpers';

export type PDFPreviewerHandle = {
    goToPage: (pageNumber: number) => void;
    getPageData: (pageNumber: number) => Promise<string | null>;
};

export type PDFPreviewerPosition = {
    left: number;
    top: number;
    width: number;
    height: number;
};

type Props = {
    file: string;
    pageMaxWidth: number;
    isSmallScreen: boolean;
    maxCanvasWidth?: number;
    maxCanvasHeight?: number;
    maxCanvasArea?: number;
    renderPasswordForm?: ({isPasswordInvalid, onSubmit, onPasswordChange}: Omit<PDFPasswordFormProps, 'onPasswordFieldFocus'>) => ReactNode | null;
    LoadingComponent?: ReactNode;
    ErrorComponent?: ReactNode;
    shouldShowErrorComponent?: boolean;
    onLoadError?: () => void;
    containerStyle?: CSSProperties;
    contentContainerStyle?: CSSProperties;
    onLoaded?: (position: PDFPreviewerPosition) => void;
    onPageChanged?: (pageNumber: number) => void;
};

type OnPasswordCallback = (password: string | null) => void;

const shouldUseLegacyWorker = isMobileSafari() && !isModernSafari();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pdfWorker = shouldUseLegacyWorker ? pdfWorkerLegacySource : pdfWorkerSource;

pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([pdfWorker], {type: 'text/javascript'}));

const DefaultLoadingComponent = <p>Loading...</p>;
const DefaultErrorComponent = <p>Failed to load the PDF file :(</p>;

const PDFPreviewer = forwardRef<PDFPreviewerHandle, Props>(
    (
        {
            file,
            pageMaxWidth,
            isSmallScreen,
            maxCanvasWidth,
            maxCanvasHeight,
            maxCanvasArea,
            LoadingComponent = DefaultLoadingComponent,
            ErrorComponent = DefaultErrorComponent,
            renderPasswordForm,
            containerStyle,
            contentContainerStyle,
            shouldShowErrorComponent = true,
            onLoadError,
            onLoaded,
            onPageChanged,
        }: Props,
        ref,
    ) => {
        const [pageViewports, setPageViewports] = useState<PageViewport[]>([]);
        const [numPages, setNumPages] = useState(0);
        const [containerWidth, setContainerWidth] = useState(0);
        const [containerHeight, setContainerHeight] = useState(0);
        const [shouldRequestPassword, setShouldRequestPassword] = useState(false);
        const [isPasswordInvalid, setIsPasswordInvalid] = useState(false);
        const [isFullyLoaded, setIsFullyLoaded] = useState(false);
        const pdfDocRef = useRef<PDFDocument | null>(null);
        const onLoadedCalledRef = useRef(false);
        const lastReportedPageRef = useRef<number | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const onPasswordCallbackRef = useRef<OnPasswordCallback | null>(null);
        const listRef = useRef<List>(null);

        /**
         * Calculate the devicePixelRatio the page should be rendered with
         * Each platform has a different default devicePixelRatio and different canvas limits, we need to verify that
         * with the default devicePixelRatio it will be able to display the pdf correctly, if not we must change the devicePixelRatio.
         * @param {Number} width of the page
         * @param {Number} height of the page
         * @returns {Number} devicePixelRatio for this page on this platform
         */
        const getDevicePixelRatio = (width: number, height: number): number | undefined => {
            if (!maxCanvasWidth || !maxCanvasHeight || !maxCanvasArea) {
                return undefined;
            }

            const nbPixels = width * height;
            const ratioHeight = maxCanvasHeight / height;
            const ratioWidth = maxCanvasWidth / width;
            const ratioArea = Math.sqrt(maxCanvasArea / nbPixels);
            const ratio = Math.min(ratioHeight, ratioArea, ratioWidth);

            if (ratio > window.devicePixelRatio) {
                return undefined;
            }

            return ratio;
        };

        /**
         * Calculates a proper page width.
         * It depends on a screen size. Also, the app should take into account the page borders.
         */
        const calculatePageWidth = useCallback(() => {
            const pageWidthOnLargeScreen = Math.min(containerWidth - LARGE_SCREEN_SIDE_SPACING * 2, pageMaxWidth);
            const pageWidth = isSmallScreen ? containerWidth : pageWidthOnLargeScreen;

            return pageWidth + PAGE_BORDER * 2;
        }, [containerWidth, pageMaxWidth, isSmallScreen]);

        /**
         * Calculates a proper page height. The method should be called only when there are page viewports.
         * It is based on a ratio between the specific page viewport width and provided page width.
         * Also, the app should take into account the page borders.
         */
        const calculatePageHeight = useCallback(
            (pageIndex: number) => {
                if (pageViewports.length === 0) {
                    return 0;
                }

                const pageWidth = calculatePageWidth();

                const {width: pageViewportWidth, height: pageViewportHeight} = pageViewports[pageIndex];
                const scale = pageWidth / pageViewportWidth;

                return pageViewportHeight * scale + PAGE_BORDER * 2;
            },
            [pageViewports, calculatePageWidth],
        );

        const estimatedPageHeight = calculatePageHeight(0);
        const pageWidth = calculatePageWidth();

        /**
         * Upon successful document load, combine an array of page viewports,
         * set the number of pages on PDF,
         * hide/reset PDF password form, and notify parent component that
         * user input is no longer required.
         */
        const onDocumentLoadSuccess = (pdf: PDFDocument) => {
            pdfDocRef.current = pdf;

            Promise.all(
                times(pdf.numPages, (index: number) => {
                    const pageNumber = index + 1;

                    return pdf.getPage(pageNumber).then((page) => page.getViewport({scale: 1}));
                }),
            ).then(
                (viewports: PageViewport[]) => {
                    setPageViewports(viewports);
                    setNumPages(pdf.numPages);
                    setShouldRequestPassword(false);
                    setIsPasswordInvalid(false);
                    setIsFullyLoaded(true);
                    lastReportedPageRef.current = null;
                    onLoadedCalledRef.current = false;
                },
                () => {
                    console.error('Error getting page viewports:');
                    onLoadError?.();
                    pdfDocRef.current = null;
                },
            );
        };

        /**
         * Initiate password challenge process. The react-pdf/Document
         * component calls this handler to indicate that a PDF requires a
         * password, or to indicate that a previously provided password was
         * invalid.
         *
         * The PasswordResponses constants used below were copied from react-pdf
         * because they're not exported in entry.webpack.
         */
        const initiatePasswordChallenge = (callback: OnPasswordCallback, reason: number) => {
            onPasswordCallbackRef.current = callback;

            if (reason === PDF_PASSWORD_FORM_RESPONSES.NEED_PASSWORD) {
                setShouldRequestPassword(true);
            } else if (reason === PDF_PASSWORD_FORM_RESPONSES.INCORRECT_PASSWORD) {
                setShouldRequestPassword(true);
                setIsPasswordInvalid(true);
            }
        };

        /**
         * Send password to react-pdf via its callback so that it can attempt to load
         * the PDF.
         */
        const attemptPDFLoad = (password: string) => {
            onPasswordCallbackRef.current?.(password);
        };

        /**
         * Render a form to handle password typing.
         * The method renders the passed or default component.
         */
        const internalRenderPasswordForm = useCallback(() => {
            const onSubmit = attemptPDFLoad;
            const onPasswordChange = () => setIsPasswordInvalid(false);

            if (typeof renderPasswordForm === 'function') {
                return renderPasswordForm({
                    isPasswordInvalid,
                    onSubmit,
                    onPasswordChange,
                });
            }

            return (
                <PDFPasswordForm
                    isPasswordInvalid={isPasswordInvalid}
                    onSubmit={onSubmit}
                    onPasswordChange={onPasswordChange}
                />
            );
        }, [isPasswordInvalid, attemptPDFLoad, setIsPasswordInvalid, renderPasswordForm]);

        const handleItemsRendered = useCallback(
            ({visibleStartIndex}: ListOnItemsRenderedProps) => {
                if (!onPageChanged) {
                    return;
                }

                // visibleStartIndex is 0-based, page numbers are 1-based
                const currentPageNumber = visibleStartIndex + 1;
                if (currentPageNumber !== lastReportedPageRef.current) {
                    onPageChanged(currentPageNumber);
                    lastReportedPageRef.current = currentPageNumber;
                }
            },
            [onPageChanged],
        );

        /**
         * Reset List style cache when dimensions change
         */
        useLayoutEffect(() => {
            if (containerWidth > 0 && containerHeight > 0) {
                listRef.current?.resetAfterIndex(0);
            }
        }, [containerWidth, containerHeight]);

        useLayoutEffect(() => {
            if (!containerRef.current) {
                return undefined;
            }
            const resizeObserver = new ResizeObserver(() => {
                if (!containerRef.current) {
                    return;
                }
                setContainerWidth(containerRef.current.clientWidth);
                setContainerHeight(containerRef.current.clientHeight);

                // Ensures onLoaded fire just in first time.
                onLoadedCalledRef.current = false;
                setIsFullyLoaded(true);
            });
            resizeObserver.observe(containerRef.current);

            return () => resizeObserver.disconnect();
        }, []);

        useLayoutEffect(() => {
            if (isFullyLoaded && containerRef.current && onLoaded && !onLoadedCalledRef.current) {
                if (containerWidth > 0 && containerHeight > 0) {
                    const rect = containerRef.current.getBoundingClientRect();
                    onLoaded({
                        left: rect.left + window.scrollX,
                        top: rect.top + window.scrollY,
                        width: rect.width,
                        height: rect.height,
                    });
                    onLoadedCalledRef.current = true;
                }
            }
        }, [isFullyLoaded, onLoaded, containerWidth, containerHeight]);

        useImperativeHandle(
            ref,
            () => ({
                /**
                 * Scrolls the PDF viewer to the specified page number.
                 * @param pageNumber - The 1-based page number to scroll to.
                 */
                goToPage: (pageNumber: number) => {
                    if (!listRef.current || pageNumber < 1 || pageNumber > numPages) {
                        console.warn(`[PDFPreviewer] Invalid page number ${pageNumber} requested.`);
                        return;
                    }
                    const pageIndex = pageNumber - 1; // Convert to 0-based index
                    listRef.current.scrollToItem(pageIndex, 'start'); // Align page to the top
                },

                /**
                 * Renders a specific page to an offscreen canvas and returns its base64 data URL.
                 * @param pageNumber - The 1-based page number to get data for.
                 * @returns A promise that resolves with the base64 data URL (e.g., "data:image/png;base64,...") or null if an error occurs.
                 */
                // eslint-disable-next-line no-restricted-syntax
                getPageData: async (pageNumber: number): Promise<string | null> => {
                    if (!pdfDocRef.current || pageNumber < 1 || pageNumber > numPages) {
                        console.error(`[PDFPreviewer] Cannot get data for invalid page number ${pageNumber} or PDF not loaded.`);
                        return null;
                    }

                    try {
                        // eslint-disable-next-line no-restricted-syntax
                        const page = await pdfDocRef.current.getPage(pageNumber);
                        const scale = 1.0;
                        const viewport = page.getViewport({scale});

                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (!context) {
                            console.error('[PDFPreviewer] Could not get canvas context.');
                            return null;
                        }

                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        const renderContext = {
                            canvasContext: context,
                            viewport,
                        };
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
                        const renderTask = page.render(renderContext as never);

                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,no-restricted-syntax
                        await renderTask.promise;

                        return canvas.toDataURL('image/png');
                    } catch (error) {
                        console.error(`[PDFPreviewer] Error getting data for page ${pageNumber}:`, error);
                        return null;
                    }
                },
            }),
            [numPages],
        );

        return (
            <div
                ref={containerRef}
                style={{...styles.container, ...containerStyle}}
            >
                <div style={{...styles.innerContainer, ...(shouldRequestPassword ? styles.invisibleContainer : {})}}>
                    <Document
                        file={file}
                        options={DEFAULT_DOCUMENT_OPTIONS}
                        externalLinkTarget={DEFAULT_EXTERNAL_LINK_TARGET}
                        error={shouldShowErrorComponent ? ErrorComponent : null}
                        onLoadError={() => {
                            pdfDocRef.current = null;
                            setIsFullyLoaded(false);
                            onLoadedCalledRef.current = false;
                            onLoadError?.();
                        }}
                        loading={LoadingComponent}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onPassword={initiatePasswordChallenge}
                    >
                        {pageViewports.length > 0 && (
                            <List
                                ref={listRef}
                                style={{...styles.list, ...contentContainerStyle}}
                                outerRef={setListAttributes}
                                width={isSmallScreen ? pageWidth : containerWidth}
                                height={containerHeight}
                                itemCount={numPages}
                                itemSize={calculatePageHeight}
                                estimatedItemSize={calculatePageHeight(0)}
                                itemData={{
                                    pageWidth,
                                    estimatedPageHeight,
                                    calculatePageHeight,
                                    getDevicePixelRatio,
                                    containerHeight,
                                    numPages,
                                }}
                                onItemsRendered={handleItemsRendered}
                            >
                                {PageRenderer}
                            </List>
                        )}
                    </Document>
                </div>

                {shouldRequestPassword && internalRenderPasswordForm()}
            </div>
        );
    },
);

PDFPreviewer.displayName = 'PDFPreviewer';

export default memo(PDFPreviewer);
