import React from 'react';
type Props = {
    isPasswordInvalid?: boolean;
    onSubmit?: (password: string) => void;
    onPasswordChange?: (password: string) => void;
    onPasswordFieldFocus?: (isFocused: boolean) => void;
};
declare function PDFPasswordForm({ isPasswordInvalid, onSubmit, onPasswordChange, onPasswordFieldFocus }: Props): React.JSX.Element;
declare namespace PDFPasswordForm {
    var displayName: string;
}
export type { Props as PDFPasswordFormProps };
export default PDFPasswordForm;
//# sourceMappingURL=PDFPasswordForm.d.ts.map