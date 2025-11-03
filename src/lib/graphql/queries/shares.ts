import { gql } from "urql";

export const GET_HYPERSHARES = gql`
  query sharesByWallet($walletAddress: ID!) {
    shareProposalDatas(where: { operator: $walletAddress }) {
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
