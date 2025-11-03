import { gql } from "urql";

export const ALL_SHARES_BY_HOLDER = gql`
  query AllSharesByHolder($ADDRESS: Bytes!) {
    legacyShareProposalDatas(
      first: 1000
      orderBy: proposalId
      where: {
        or: [
          { rTokenHolders_: { holder: $ADDRESS, amount_gt: 0 } }
          { wTokenHolders_: { holder: $ADDRESS, amount_gt: 0 } }
        ]
      }
    ) {
      proposalId
      shareNumberId
      chypcId
      licenseId
      rTokenId
      wTokenId
      operator
    }
    shareProposalDatas(
      first: 1000
      orderBy: proposalId
      where: {
        or: [
          { rTokenHolders_: { holder: $ADDRESS, amount_gt: 0 } }
          { wTokenHolders_: { holder: $ADDRESS, amount_gt: 0 } }
        ]
      }
    ) {
      proposalId
      shareNumberId
      chypcId
      licenseId
      rTokenId
      wTokenId
      operator
    }
  }
`;
