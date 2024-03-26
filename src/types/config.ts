import { Creator } from "./models";

export type CollectionConfig = {
    name: string;
    uri: string;
    royaltyEnforcementConfig?: RoyaltyEnforcementConfig;
}

export type RoyaltyEnforcementConfig = {
    basisPoints: number,
    creators: Creator[],
    authority?: string;
}