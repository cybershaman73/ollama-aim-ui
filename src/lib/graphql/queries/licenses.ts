import { gql } from "urql";

export const GET_LICENSES = gql`
  query LicensesByWallet($walletAddress: ID!) {
    account(id: $walletAddress) {
      id
      licenses(first: 1000, where: { owner: $walletAddress }) {
        id
      }
    }
  }
`;
