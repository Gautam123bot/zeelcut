export interface AttributeValue {
  id: string;
  value: string;
}
export interface AttributeCategory {
  id: string;
  isRequired: boolean;
  category?: {
    id?: string;
    name: string;
  };
}
export interface Attribute {
  id: string;
  name: string;
  type: string;
  slug: string;
  values?: AttributeValue[];
  categories?: AttributeCategory[];
}

export interface DropdownOption {
  label: string;
  value: string;
}

// Possible attribute types
export type AttributeType = "select" | "text" | "multiselect";

// Form states
export interface AttributeFormState {
  name: string;
  type: AttributeType;
}

export interface AssignmentFormState {
  attributeId: string;
  categoryId: string;
  productId: string;
  isRequired: boolean;
}
