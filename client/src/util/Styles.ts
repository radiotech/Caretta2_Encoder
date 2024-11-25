import {CSSProperties} from 'react';

// Define a type for Radium styles
type RadiumStyleProp = CSSProperties | undefined | null | boolean;

// Export a function that casts from Radium styles to typical CSS styles
export const style = (styles: RadiumStyleProp | RadiumStyleProp[]) => styles as CSSProperties;

// Define the extended Radium style rules to combine with CSSProperties
type StyleRules = {
    ':hover'?: React.CSSProperties,
}

// Export a styles type that combines Radium and React style types
export type Style = CSSProperties & StyleRules;
