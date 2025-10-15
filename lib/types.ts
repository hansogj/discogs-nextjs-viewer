
export interface DiscogsUser {
  id: number;
  username: string;
  resource_url: string;
  avatar_url: string;
}

export interface DiscogsUserProfile {
  id: number;
  username: string;
  name?: string;
  profile?: string;
  location?: string;
  home_page?: string;
  registered: string;
  rank: number;
  num_pending: number;
  num_for_sale: number;
  num_collection: number;
  num_wantlist: number;
  num_lists: number;
  releases_contributed: number;
  releases_rated: number;
  rating_avg: number;
  avatar_url: string;
  uri: string;
  resource_url: string;
}

export interface BasicInformation {
  id: number;
  master_id: number;
  master_url: string;
  resource_url: string;
  thumb: string;
  cover_image: string;
  title: string;
  year: number;
  formats: {
    name: string;
    qty: string;
    text?: string;
    descriptions: string[];
  }[];
  labels: {
    name: string;
    catno: string;
    entity_type: string;
    id: number;
    resource_url: string;
  }[];
  artists: {
    name: string;
    anv: string;
    join: string;
    role: string;
    tracks: string;
    id: number;
    resource_url: string;
  }[];
}

export interface ExtraArtist {
  name: string;
  role: string;
}

export interface ReleaseDetails {
  extraartists?: ExtraArtist[];
  notes?: string;
  styles?: string[];
  genres?: string[];
}

export interface FullRelease extends ReleaseDetails {
  id: number;
}

export interface CollectionRelease {
  id: number;
  instance_id: number;
  date_added: string;
  rating: number;
  basic_information: BasicInformation;
  folder_id: number;
  details?: ReleaseDetails;
  master_year?: number;
}

export interface WantlistRelease {
  id: number;
  resource_url: string;
  rating: number;
  date_added: string;
  basic_information: BasicInformation;
  details?: ReleaseDetails;
}

export interface MasterRelease {
  id: number;
  images: {
    type: string;
    uri: string;
    resource_url: string;
    uri150: string;
    width: number;
    height: number;
  }[];
  title: string;
  artists: {
    name: string;
    anv: string;
    join: string;
    role: string;
    tracks: string;
    id: number;
    resource_url: string;
  }[];
  year: number;
}

export interface ProcessedWantlistItem extends WantlistRelease {
  master_cover_image: string;
  master_year?: number;
}

export interface Pagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls: {
    last?: string;
    next?: string;
  };
}

export interface CollectionResponse {
  pagination: Pagination;
  releases: CollectionRelease[];
}

export interface WantlistResponse {
  pagination: Pagination;
  wants: WantlistRelease[];
}

export interface Folder {
  id: number;
  count: number;
  name: string;
  resource_url: string;
}

export interface FoldersResponse {
  folders: Folder[];
}

export interface SyncInfo {
  collectionLastAdded?: string;
  wantlistLastAdded?: string;
}
