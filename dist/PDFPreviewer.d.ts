import React, { CSSProperties, ReactNode } from 'react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { type PDFPasswordFormProps } from './PDFPasswordForm';
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
    renderPasswordForm?: ({ isPasswordInvalid, onSubmit, onPasswordChange }: Omit<PDFPasswordFormProps, 'onPasswordFieldFocus'>) => ReactNode | null;
    LoadingComponent?: ReactNode;
    ErrorComponent?: ReactNode;
    shouldShowErrorComponent?: boolean;
    onLoadError?: () => void;
    containerStyle?: CSSProperties;
    contentContainerStyle?: CSSProperties;
    onLoaded?: (position: PDFPreviewerPosition) => void;
    onPageChanged?: (pageNumber: number) => void;
};
declare const _default: React.MemoExoticComponent<React.ForwardRefExoticComponent<Props & React.RefAttributes<PDFPreviewerHandle>>>;
export default _default;
//# sourceMappingURL=PDFPreviewer.d.ts.map