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

export type RentmanLinkedItemType = 'contact' | 'crew';

export type RentmanCustomFieldModel =
  | 'project'
  | 'subproject'
  | 'projectfunction'
  | 'projectcrew'
  | 'projectequipment'
  | 'projectvehicle'
  | 'equipment'
  | 'serialnumber'
  | 'subrental'
  | 'contact'
  | 'contactperson'
  | 'crew'
  | 'repair';

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

export interface RentmanDropdownOption {
  id: number;
  name: string;
}

export interface RentmanCustomFieldDefinition<
  T extends RentmanCustomFieldType = RentmanCustomFieldType,
> {
  id: number;
  name: string;
  type: T;
  belongs_to?: RentmanCustomFieldModel;
  input_fields_group?: string;
  required?: boolean;
  default_value?: string | number | boolean | null;
  options?: RentmanDropdownOption[];
  linked_item_type?: RentmanLinkedItemType;
}

export type RentmanCustomRecord = {
  custom?: Record<
    string,
    RentmanCustomFieldTypeMap[keyof RentmanCustomFieldTypeMap]
  >;
};

export type WithCustomFields<
  TBase,
  TCustom extends {
    [K in keyof TCustom]: RentmanCustomFieldTypeMap[keyof RentmanCustomFieldTypeMap];
  } = Record<string, never>,
> = TBase & { custom?: TCustom };
