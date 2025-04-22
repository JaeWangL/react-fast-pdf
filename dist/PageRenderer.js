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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_pdf_1 = require("react-pdf");
const styles_1 = require("./styles");
const constants_1 = require("./constants");
function PageRenderer({ index, style, data }) {
    const { pageWidth, estimatedPageHeight, calculatePageHeight, getDevicePixelRatio, numPages, containerHeight } = data;
    /**
     * Render a specific page based on its index.
     * The method includes a wrapper to apply virtualized styles.
     */
    const pageHeight = calculatePageHeight(index);
    const devicePixelRatio = getDevicePixelRatio(pageWidth, pageHeight);
    const parsedHeight = parseFloat(style.height);
    const parsedTop = parseFloat(style.top);
    const topPadding = numPages > 1 || parsedHeight > containerHeight ? parsedTop + constants_1.PAGE_BORDER : (containerHeight - parsedHeight) / 2;
    return (react_1.default.createElement("div", { style: Object.assign(Object.assign(Object.assign({}, styles_1.pdfPreviewerStyles.pageWrapper), style), { top: `${topPadding}px` }) },
        react_1.default.createElement(react_pdf_1.Page, { key: `page_${index}`, width: pageWidth, height: pageHeight || estimatedPageHeight, pageIndex: index, 
            // This needs to be empty to avoid multiple loading texts which show per page and look ugly
            // See https://github.com/Expensify/App/issues/14358 for more details
            loading: "", devicePixelRatio: devicePixelRatio })));
}
PageRenderer.displayName = 'PageRenderer';
exports.default = (0, react_1.memo)(PageRenderer);
