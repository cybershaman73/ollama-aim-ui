import { gql } from "urql";

export const CEO_MODE_SHARES = gql`
  query CeoModeShares($STR: Bytes!) {
    shareProposalDatas(
      first: 1000
      orderBy: proposalId
      where: { operatorString: $STR }
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
