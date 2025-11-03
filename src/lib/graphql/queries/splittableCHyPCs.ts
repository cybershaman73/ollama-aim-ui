import { gql } from "urql";

export const SPLITTABLE_CHYPCS = gql`
  query SplittableCHyPCs($targetLevel: BigInt!) {
    chyPCSwapV2S(where: { level: $targetLevel }) {
      tokenId
      level
      isMinted
      assignedString
      owner {
        id
      }
    }
  }
`;
