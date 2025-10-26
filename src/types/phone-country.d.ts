/**
 * Type declarations for third-party libraries
 */

declare module 'react-phone-number-input' {
  import { ComponentType } from 'react';
  
  export type Country = string;
  export type Value = string;
  export type E164Number = string;
  
  export interface Props<InputComponentType> {
    value?: Value;
    onChange?: (value?: Value) => void;
    country?: Country;
    defaultCountry?: Country;
    countries?: Country[];
    labels?: { [country: string]: string };
    international?: boolean;
    withCountryCallingCode?: boolean;
    countryCallingCodeEditable?: boolean;
    limitMaxLength?: boolean;
    countrySelectComponent?: ComponentType<any>;
    inputComponent?: InputComponentType;
    numberInputProps?: object;
    smartCaret?: boolean;
    useNationalFormatForDefaultCountryValue?: boolean;
    countrySelectProps?: object;
    flagComponent?: ComponentType<FlagProps>;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
  }
  
  export interface FlagProps {
    country: Country;
    countryName: string;
  }
  
  const PhoneInput: ComponentType<Props<any>>;
  export default PhoneInput;
  
  export function getCountryCallingCode(country: Country): string;
  export function parsePhoneNumber(value: string): any;
  export function formatPhoneNumber(value: string): string;
  export function formatPhoneNumberIntl(value: string): string;
  export function isValidPhoneNumber(value: string): boolean;
}

declare module 'react-phone-number-input/flags' {
  import { ComponentType } from 'react';
  import { Country } from 'react-phone-number-input';
  
  const flags: {
    [key: string]: ComponentType<{ title?: string }>;
  };
  
  export default flags;
}

declare module 'react-circle-flags' {
  import { ComponentType } from 'react';
  
  export interface CircleFlagProps {
    countryCode: string;
    height?: number | string;
    width?: number | string;
    className?: string;
  }
  
  export const CircleFlag: ComponentType<CircleFlagProps>;
}

declare module 'country-data-list' {
  export interface Country {
    alpha2: string;
    alpha3: string;
    countryCallingCodes: string[];
    currencies: string[];
    emoji?: string;
    ioc: string;
    languages: string[];
    name: string;
    status: string;
  }
  
  export const countries: {
    all: Country[];
    [key: string]: any;
  };
  
  export const currencies: any;
  export const languages: any;
  export const regions: any;
}

