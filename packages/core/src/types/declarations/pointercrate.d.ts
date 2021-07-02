declare namespace Pointercrate {
  export type ListedDemonsResponse = ListedDemon[];

  export interface ListedDemon {
    id: number;
    position: number;
    name: string;
    requirement: number;
    video: null | string;
    publisher: User;
    verifier: User;
    level_id: number;
  }

  export interface User {
    id: number;
    name: string;
    banned: boolean;
  }
}
