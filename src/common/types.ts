export interface CarparkAvailabilityData {
  value: {
    CarParkID: string;
    Area: string;
    Development: string;
    Location: string;
    AvailableLots: number;
    LotType: string;
    Agency: string;
  }[];
}

export interface CarparkAvailability extends CarparkAvailabilityData {
  metadata: {};
}
