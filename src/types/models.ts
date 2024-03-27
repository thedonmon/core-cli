export type Creator = {
    address: string;
    percentage: number;
}

export type BaseCompute = {
    price?: number;
    units?: number;
}

export type Metadata = {
    name:                    string;
    description?:             string;
    seller_fee_basis_points: number;
    image?:                   string;
    external_url:            string;
    attributes:              Attributes;
    properties:              Properties;
}

export type Properties = {
    category?: string;
    files?:    File[];
    creators?: Creators;
}

export type File = {
    uri: string;
    type: string;
    [key: string]: unknown;
}

export type Attributes = Array<Attribute>;

export type Attribute = {
    trait_type: string;
    value: string;
    [key: string]: unknown;
};

export type CreatorType = {
    address: string;
    verified: boolean;
    share: number;
};

export type Creators = Array<CreatorType>;