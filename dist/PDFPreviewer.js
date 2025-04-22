"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/extensions
const pdf_worker_min_mjs_1 = __importDefault(require("pdfjs-dist/build/pdf.worker.min.mjs"));
// eslint-disable-next-line import/extensions
const pdf_worker_mjs_1 = __importDefault(require("pdfjs-dist/legacy/build/pdf.worker.mjs"));
const react_1 = __importStar(require("react"));
const times_1 = __importDefault(require("lodash/times"));
const react_window_1 = require("react-window");
const react_pdf_1 = require("react-pdf");
require("react-pdf/dist/Page/AnnotationLayer.css");
require("react-pdf/dist/Page/TextLayer.css");
const styles_1 = require("./styles");
const PDFPasswordForm_1 = __importDefault(require("./PDFPasswordForm"));
const PageRenderer_1 = __importDefault(require("./PageRenderer"));
const constants_1 = require("./constants");
const helpers_1 = require("./helpers");
const shouldUseLegacyWorker = (0, helpers_1.isMobileSafari)() && !(0, helpers_1.isModernSafari)();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const pdfWorker = shouldUseLegacyWorker ? pdf_worker_mjs_1.default : pdf_worker_min_mjs_1.default;
react_pdf_1.pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([pdfWorker], { type: 'text/javascript' }));
const DefaultLoadingComponent = react_1.default.createElement("p", null, "Loading...");
const DefaultErrorComponent = react_1.default.createElement("p", null, "Failed to load the PDF file :(");
const PDFPreviewer = (0, react_1.forwardRef)(({ file, pageMaxWidth, isSmallScreen, maxCanvasWidth, maxCanvasHeight, maxCanvasArea, LoadingComponent = DefaultLoadingComponent, ErrorComponent = DefaultErrorComponent, renderPasswordForm, containerStyle, contentContainerStyle, shouldShowErrorComponent = true, onLoadError, onLoaded, onPageChanged, }, ref) => {
    const [pageViewports, setPageViewports] = (0, react_1.useState)([]);
    const [numPages, setNumPages] = (0, react_1.useState)(0);
    const [containerWidth, setContainerWidth] = (0, react_1.useState)(0);
    const [containerHeight, setContainerHeight] = (0, react_1.useState)(0);
    const [shouldRequestPassword, setShouldRequestPassword] = (0, react_1.useState)(false);
    const [isPasswordInvalid, setIsPasswordInvalid] = (0, react_1.useState)(false);
    const [isFullyLoaded, setIsFullyLoaded] = (0, react_1.useState)(false);
    const pdfDocRef = (0, react_1.useRef)(null);
    const onLoadedCalledRef = (0, react_1.useRef)(false);
    const lastReportedPageRef = (0, react_1.useRef)(null);
    const containerRef = (0, react_1.useRef)(null);
    const onPasswordCallbackRef = (0, react_1.useRef)(null);
    const listRef = (0, react_1.useRef)(null);
    /**
     * Calculate the devicePixelRatio the page should be rendered with
     * Each platform has a different default devicePixelRatio and different canvas limits, we need to verify that
     * with the default devicePixelRatio it will be able to display the pdf correctly, if not we must change the devicePixelRatio.
     * @param {Number} width of the page
     * @param {Number} height of the page
     * @returns {Number} devicePixelRatio for this page on this platform
     */
    const getDevicePixelRatio = (width, height) => {
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
    const calculatePageWidth = (0, react_1.useCallback)(() => {
        const pageWidthOnLargeScreen = Math.min(containerWidth - constants_1.LARGE_SCREEN_SIDE_SPACING * 2, pageMaxWidth);
        const pageWidth = isSmallScreen ? containerWidth : pageWidthOnLargeScreen;
        return pageWidth + constants_1.PAGE_BORDER * 2;
    }, [containerWidth, pageMaxWidth, isSmallScreen]);
    /**
     * Calculates a proper page height. The method should be called only when there are page viewports.
     * It is based on a ratio between the specific page viewport width and provided page width.
     * Also, the app should take into account the page borders.
     */
    const calculatePageHeight = (0, react_1.useCallback)((pageIndex) => {
        if (pageViewports.length === 0) {
            return 0;
        }
        const pageWidth = calculatePageWidth();
        const { width: pageViewportWidth, height: pageViewportHeight } = pageViewports[pageIndex];
        const scale = pageWidth / pageViewportWidth;
        return pageViewportHeight * scale + constants_1.PAGE_BORDER * 2;
    }, [pageViewports, calculatePageWidth]);
    const estimatedPageHeight = calculatePageHeight(0);
    const pageWidth = calculatePageWidth();
    /**
     * Upon successful document load, combine an array of page viewports,
     * set the number of pages on PDF,
     * hide/reset PDF password form, and notify parent component that
     * user input is no longer required.
     */
    const onDocumentLoadSuccess = (pdf) => {
        pdfDocRef.current = pdf;
        Promise.all((0, times_1.default)(pdf.numPages, (index) => {
            const pageNumber = index + 1;
            return pdf.getPage(pageNumber).then((page) => page.getViewport({ scale: 1 }));
        })).then((viewports) => {
            setPageViewports(viewports);
            setNumPages(pdf.numPages);
            setShouldRequestPassword(false);
            setIsPasswordInvalid(false);
            setIsFullyLoaded(true);
            lastReportedPageRef.current = null;
            onLoadedCalledRef.current = false;
        }, () => {
            console.error('Error getting page viewports:');
            onLoadError === null || onLoadError === void 0 ? void 0 : onLoadError();
            pdfDocRef.current = null;
        });
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
    const initiatePasswordChallenge = (callback, reason) => {
        onPasswordCallbackRef.current = callback;
        if (reason === constants_1.PDF_PASSWORD_FORM_RESPONSES.NEED_PASSWORD) {
            setShouldRequestPassword(true);
        }
        else if (reason === constants_1.PDF_PASSWORD_FORM_RESPONSES.INCORRECT_PASSWORD) {
            setShouldRequestPassword(true);
            setIsPasswordInvalid(true);
        }
    };
    /**
     * Send password to react-pdf via its callback so that it can attempt to load
     * the PDF.
     */
    const attemptPDFLoad = (password) => {
        var _a;
        (_a = onPasswordCallbackRef.current) === null || _a === void 0 ? void 0 : _a.call(onPasswordCallbackRef, password);
    };
    /**
     * Render a form to handle password typing.
     * The method renders the passed or default component.
     */
    const internalRenderPasswordForm = (0, react_1.useCallback)(() => {
        const onSubmit = attemptPDFLoad;
        const onPasswordChange = () => setIsPasswordInvalid(false);
        if (typeof renderPasswordForm === 'function') {
            return renderPasswordForm({
                isPasswordInvalid,
                onSubmit,
                onPasswordChange,
            });
        }
        return (react_1.default.createElement(PDFPasswordForm_1.default, { isPasswordInvalid: isPasswordInvalid, onSubmit: onSubmit, onPasswordChange: onPasswordChange }));
    }, [isPasswordInvalid, attemptPDFLoad, setIsPasswordInvalid, renderPasswordForm]);
    const handleItemsRendered = (0, react_1.useCallback)(({ visibleStartIndex }) => {
        if (!onPageChanged) {
            return;
        }
        // visibleStartIndex is 0-based, page numbers are 1-based
        const currentPageNumber = visibleStartIndex + 1;
        if (currentPageNumber !== lastReportedPageRef.current) {
            onPageChanged(currentPageNumber);
            lastReportedPageRef.current = currentPageNumber;
        }
    }, [onPageChanged]);
    /**
     * Reset List style cache when dimensions change
     */
    (0, react_1.useLayoutEffect)(() => {
        var _a;
        if (containerWidth > 0 && containerHeight > 0) {
            (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.resetAfterIndex(0);
        }
    }, [containerWidth, containerHeight]);
    (0, react_1.useLayoutEffect)(() => {
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
    (0, react_1.useLayoutEffect)(() => {
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
    (0, react_1.useImperativeHandle)(ref, () => ({
        /**
         * Scrolls the PDF viewer to the specified page number.
         * @param pageNumber - The 1-based page number to scroll to.
         */
        goToPage: (pageNumber) => {
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
        getPageData: (pageNumber) => __awaiter(void 0, void 0, void 0, function* () {
            if (!pdfDocRef.current || pageNumber < 1 || pageNumber > numPages) {
                console.error(`[PDFPreviewer] Cannot get data for invalid page number ${pageNumber} or PDF not loaded.`);
                return null;
            }
            try {
                // eslint-disable-next-line no-restricted-syntax
                const page = yield pdfDocRef.current.getPage(pageNumber);
                const scale = 1.0;
                const viewport = page.getViewport({ scale });
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
                const renderTask = page.render(renderContext);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,no-restricted-syntax
                yield renderTask.promise;
                return canvas.toDataURL('image/png');
            }
            catch (error) {
                console.error(`[PDFPreviewer] Error getting data for page ${pageNumber}:`, error);
                return null;
            }
        }),
    }), [numPages]);
    return (react_1.default.createElement("div", { ref: containerRef, style: Object.assign(Object.assign({}, styles_1.pdfPreviewerStyles.container), containerStyle) },
        react_1.default.createElement("div", { style: Object.assign(Object.assign({}, styles_1.pdfPreviewerStyles.innerContainer), (shouldRequestPassword ? styles_1.pdfPreviewerStyles.invisibleContainer : {})) },
            react_1.default.createElement(react_pdf_1.Document, { file: file, options: constants_1.DEFAULT_DOCUMENT_OPTIONS, externalLinkTarget: constants_1.DEFAULT_EXTERNAL_LINK_TARGET, error: shouldShowErrorComponent ? ErrorComponent : null, onLoadError: () => {
                    pdfDocRef.current = null;
                    setIsFullyLoaded(false);
                    onLoadedCalledRef.current = false;
                    onLoadError === null || onLoadError === void 0 ? void 0 : onLoadError();
                }, loading: LoadingComponent, onLoadSuccess: onDocumentLoadSuccess, onPassword: initiatePasswordChallenge }, pageViewports.length > 0 && (react_1.default.createElement(react_window_1.VariableSizeList, { ref: listRef, style: Object.assign(Object.assign({}, styles_1.pdfPreviewerStyles.list), contentContainerStyle), outerRef: helpers_1.setListAttributes, width: isSmallScreen ? pageWidth : containerWidth, height: containerHeight, itemCount: numPages, itemSize: calculatePageHeight, estimatedItemSize: calculatePageHeight(0), itemData: {
                    pageWidth,
                    estimatedPageHeight,
                    calculatePageHeight,
                    getDevicePixelRatio,
                    containerHeight,
                    numPages,
                }, onItemsRendered: handleItemsRendered }, PageRenderer_1.default)))),
        shouldRequestPassword && internalRenderPasswordForm()));
});
PDFPreviewer.displayName = 'PDFPreviewer';
exports.default = (0, react_1.memo)(PDFPreviewer);
