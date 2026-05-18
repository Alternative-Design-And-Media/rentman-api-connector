export type RentmanCustomFieldType =
  | 'text'
  | 'formatted_text'
  | 'linked_item'
  | 'link'
  | 'phone'
  | 'yes_no'
  | 'color'
  | 'date'
  | 'datetime'
  | 'decimal'
  | 'dropdown'
  | 'integer'
  | 'long_text'
  | 'price';

export interface RentmanCustomFieldTypeMap {
  text: string;
  formatted_text: string;
  linked_item: string;
  link: string;
  phone: string;
  yes_no: boolean;
  color: string;
  date: string;
  datetime: string;
  decimal: number;
  dropdown: string;
  integer: number;
  long_text: string;
  price: number;
}

export interface RentmanCustomFieldDefinition<
  T extends RentmanCustomFieldType = RentmanCustomFieldType,
> {
  id: number;
  name: string;
  type: T;
}

export type RentmanCustomRecord = {
  custom?: Record<
    string,
    RentmanCustomFieldTypeMap[keyof RentmanCustomFieldTypeMap]
  >;
};

export type WithCustomFields<
  TBase,
  TCustom extends Record<
    string,
    RentmanCustomFieldTypeMap[keyof RentmanCustomFieldTypeMap]
  > = Record<string, never>,
> = TBase & { custom?: TCustom };
