export interface IpQueryResponse {
  ip: string;

  isp: {
    asn: string;
    org: string;
    isp: string;
  };

  location: {
    country: string;
    country_code: string;
    city: string;
    state: string;
    zipcode: string;
    latitude: number;
    longitude: number;
    timezone: string;
    localtime: string;
  };

  risk: {
    is_mobile: boolean;
    is_vpn: boolean;
    is_tor: boolean;
    is_proxy: boolean;
    is_datacenter: boolean;
    risk_score: number;
  };
}
