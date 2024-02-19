import type { Database } from '@/server/db'

import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { FriendshipStatusSchema } from '@/utils/server/friendship-schemas'
import { protectedProcedure } from '@/server/trpc/procedures'
import { router } from '@/server/trpc/router'
import {
  NonEmptyStringSchema,
  CountSchema,
  IdSchema,
} from '@/utils/server/base-schemas'
import { el } from '@faker-js/faker'

export const myFriendRouter = router({
  getById: protectedProcedure
    .input(
      z.object({
        friendUserId: IdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // const totalMutualFriendCount = await ctx.db.selectFrom('friendships')
      //   .where((eb) => eb.or([
      //     eb('friendUserId', '=', input.friendUserId),
      //     eb('friendUserId', '=', ctx.session.userId)
      //   ]).and('friendships.status', '=', FriendshipStatusSchema.Values['accepted']))
      //   .select('friendships.userId')
      //   .groupBy('friendships.userId')
      //   .having((eb) => eb.fn.count('friendships.userId'),'>','1')
      //   .select((eb) => [
      //     eb.fn.count('friendships.userId').as('totalMutualFriendCount'),
      //   ])
      //   .execute()
      // console.log(']]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]')
      // console.log(totalMutualFriendCount)
      
      // console.log(']]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]')

      return ctx.db.connection().execute(async (conn) => {


        const mutualFriendData = await conn
        .selectFrom('friendships')
        .where((eb) => eb.or([
          eb('friendUserId', '=', input.friendUserId),
          eb('friendUserId', '=', ctx.session.userId)
        ]).and('friendships.status', '=', FriendshipStatusSchema.Values['accepted']))
        .groupBy('friendships.userId')
        .having((eb) => eb.fn.count('friendships.userId'),'>',1)
        
        .select('friendships.userId')
        .execute()

      console.log(']]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]')
      console.log(mutualFriendData.length)
      
      console.log(']]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]')
        const result = await conn
        .selectFrom('users as friends')
        .innerJoin('friendships', 'friendships.friendUserId', 'friends.id')
        .innerJoin(
          userTotalFriendCount(conn).as('userTotalFriendCount'),
          'userTotalFriendCount.userId',
          'friends.id'
        )
        .where('friendships.userId', '=', ctx.session.userId)
        .where('friendships.friendUserId', '=', input.friendUserId)
        .where(
          'friendships.status',
          '=',
          FriendshipStatusSchema.Values['accepted']
        )
        .select([
          'friends.id',
          'friends.fullName',
          'friends.phoneNumber',
          'totalFriendCount',
          
        ])
        .executeTakeFirstOrThrow(() => new TRPCError({ code: 'NOT_FOUND' }))
        .then(
          z.object({
            id: IdSchema,
            fullName: NonEmptyStringSchema,
            phoneNumber: NonEmptyStringSchema,
            totalFriendCount: CountSchema,
            mutualFriendCount: CountSchema,
          }).parse
        )
        result.mutualFriendCount = mutualFriendData.length;
        return result;
      }
        /**
         * Question 4: Implement mutual friend count
         *
         * Add `mutualFriendCount` to the returned result of this query. You can
         * either:
         *  (1) Make a separate query to count the number of mutual friends,
         *  then combine the result with the result of this query
         *  (2) BONUS: Use a subquery (hint: take a look at how
         *  `totalFriendCount` is implemented)
         *
         * Instructions:
         *  - Go to src/server/tests/friendship-request.test.ts, enable the test
         * scenario for Question 3
         *  - Run `yarn test` to verify your answer
         *
         * Documentation references:
         *  - https://kysely-org.github.io/kysely/classes/SelectQueryBuilder.html#innerJoin
         */
        
        
      )
    }),
})

const userTotalFriendCount = (db: Database) => {
  return db
    .selectFrom('friendships')
    .where('friendships.status', '=', FriendshipStatusSchema.Values['accepted'])
    .select((eb) => [
      'friendships.userId',
      eb.fn.count('friendships.friendUserId').as('totalFriendCount'),
    ])
    .groupBy('friendships.userId')
}

