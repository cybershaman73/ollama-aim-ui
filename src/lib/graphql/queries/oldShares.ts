import { gql } from "urql";

export const GET_OLD_HYPERSHARES = gql`
  query oldSharesByWallet($walletAddress: ID!) {
    legacyShareProposalDatas(where: { operator: $walletAddress }) {
      operator
      proposalId
      rTokenId
      shareNumberId
      status
      wTokenId
      licenseId
      id
      chypcId
    }
  }
`;
