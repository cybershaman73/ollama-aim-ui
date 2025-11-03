import { gql } from "urql";

export const GET_CHYPC = gql`
  query CHyPCByWallet($walletAddress: ID!) {
    account(id: $walletAddress) {
      id
      chypcTokens(first: 1000, where: { owner: $walletAddress }) {
        id

        assignament
      }
    }
  }
`;
