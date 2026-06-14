-- Defense-in-depth RLS policies for MyEzSAT.
-- Apply in Supabase SQL editor after reviewing for your environment.
-- Prisma/server DATABASE_URL usually uses a privileged DB role and may bypass RLS;
-- these policies protect future direct browser/realtime access using authenticated JWTs.

alter table "User" enable row level security;
alter table "GameProfile" enable row level security;
alter table "FriendConnection" enable row level security;
alter table "Conversation" enable row level security;
alter table "ConversationParticipant" enable row level security;
alter table "ConversationMessage" enable row level security;
alter table "StudySession" enable row level security;
alter table "Message" enable row level security;
alter table "TopicProgress" enable row level security;
alter table "UserStats" enable row level security;
alter table "Streak" enable row level security;
alter table "DailyActivity" enable row level security;
alter table "QuestionAttempt" enable row level security;
alter table "SubtopicProgress" enable row level security;
alter table "StudyToolEvent" enable row level security;
alter table "Achievement" enable row level security;
alter table "StudyContentCache" enable row level security;
alter table "SATQuestion" enable row level security;
alter table "PracticeSession" enable row level security;
alter table "PracticeAttempt" enable row level security;
alter table "ScoreEntry" enable row level security;
alter table "StudyPlan" enable row level security;
alter table "Bookmark" enable row level security;
alter table "ParentStudentLink" enable row level security;
alter table "PointTransaction" enable row level security;
alter table "BadgeCatalog" enable row level security;
alter table "EarnedBadge" enable row level security;
alter table "Challenge" enable row level security;
alter table "ChallengeParticipant" enable row level security;
alter table "DailyQuestCatalog" enable row level security;
alter table "StudentDailyQuest" enable row level security;
alter table "VocabWord" enable row level security;
alter table "WordSubscription" enable row level security;
alter table "WordDeliveryLog" enable row level security;

create policy "users can read own user"
on "User" for select
to authenticated
using (id = auth.uid()::text);

create policy "users can update own limited profile"
on "User" for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

create policy "users can read game profiles"
on "GameProfile" for select
to authenticated
using (
  "privacySetting" = 'public'
  or "userId" = auth.uid()::text
  or (
    "privacySetting" = 'friends'
    and exists (
      select 1 from "FriendConnection" fc
      where fc.status = 'accepted'
      and (
        (fc."requesterId" = auth.uid()::text and fc."receiverId" = "GameProfile"."userId")
        or (fc."receiverId" = auth.uid()::text and fc."requesterId" = "GameProfile"."userId")
      )
    )
  )
);

create policy "users can update own game profile"
on "GameProfile" for update
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "users can read own friend connections"
on "FriendConnection" for select
to authenticated
using ("requesterId" = auth.uid()::text or "receiverId" = auth.uid()::text);

create policy "users can create own friend requests"
on "FriendConnection" for insert
to authenticated
with check ("requesterId" = auth.uid()::text and "receiverId" <> auth.uid()::text);

create policy "users can update own received friend requests"
on "FriendConnection" for update
to authenticated
using ("requesterId" = auth.uid()::text or "receiverId" = auth.uid()::text)
with check ("requesterId" = auth.uid()::text or "receiverId" = auth.uid()::text);

create policy "accepted participants can read conversations"
on "Conversation" for select
to authenticated
using (
  exists (
    select 1 from "ConversationParticipant" cp
    where cp."conversationId" = id
    and cp."userId" = auth.uid()::text
    and cp.status = 'accepted'
  )
);

create policy "users can read own conversation participant rows"
on "ConversationParticipant" for select
to authenticated
using ("userId" = auth.uid()::text);

create policy "users can update own pending conversation invites"
on "ConversationParticipant" for update
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "accepted participants can read messages"
on "ConversationMessage" for select
to authenticated
using (
  exists (
    select 1 from "ConversationParticipant" cp
    where cp."conversationId" = "ConversationMessage"."conversationId"
    and cp."userId" = auth.uid()::text
    and cp.status = 'accepted'
  )
);

create policy "accepted participants can send messages"
on "ConversationMessage" for insert
to authenticated
with check (
  "senderId" = auth.uid()::text
  and exists (
    select 1 from "ConversationParticipant" cp
    where cp."conversationId" = "ConversationMessage"."conversationId"
    and cp."userId" = auth.uid()::text
    and cp.status = 'accepted'
  )
);

create policy "owner read study sessions"
on "StudySession" for select
to authenticated
using ("userId" = auth.uid()::text);

create policy "owner write study sessions"
on "StudySession" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner read session messages"
on "Message" for select
to authenticated
using (
  exists (
    select 1 from "StudySession" s
    where s.id = "Message"."sessionId"
    and s."userId" = auth.uid()::text
  )
);

create policy "owner write session messages"
on "Message" for all
to authenticated
using (
  exists (
    select 1 from "StudySession" s
    where s.id = "Message"."sessionId"
    and s."userId" = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from "StudySession" s
    where s.id = "Message"."sessionId"
    and s."userId" = auth.uid()::text
  )
);

create policy "owner all topic progress"
on "TopicProgress" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all user stats"
on "UserStats" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all streaks"
on "Streak" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all daily activity"
on "DailyActivity" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all question attempts"
on "QuestionAttempt" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all subtopic progress"
on "SubtopicProgress" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all study tool events"
on "StudyToolEvent" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all achievements"
on "Achievement" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all study content cache"
on "StudyContentCache" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "authenticated users can read sat questions"
on "SATQuestion" for select
to authenticated
using (true);

create policy "owner all practice sessions"
on "PracticeSession" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all practice attempts"
on "PracticeAttempt" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all scores"
on "ScoreEntry" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all study plans"
on "StudyPlan" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner all bookmarks"
on "Bookmark" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "parents and students can read own links"
on "ParentStudentLink" for select
to authenticated
using ("parentId" = auth.uid()::text or "studentId" = auth.uid()::text);

create policy "parents can create own student links"
on "ParentStudentLink" for insert
to authenticated
with check ("parentId" = auth.uid()::text and "studentId" <> auth.uid()::text);

create policy "parents and students can delete own links"
on "ParentStudentLink" for delete
to authenticated
using ("parentId" = auth.uid()::text or "studentId" = auth.uid()::text);

create policy "owner read point transactions"
on "PointTransaction" for select
to authenticated
using ("userId" = auth.uid()::text);

create policy "authenticated users can read badge catalog"
on "BadgeCatalog" for select
to authenticated
using (true);

create policy "owner all earned badges"
on "EarnedBadge" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "participants can read challenges"
on "Challenge" for select
to authenticated
using (
  exists (
    select 1 from "ChallengeParticipant" cp
    where cp."challengeId" = id
    and cp."userId" = auth.uid()::text
  )
);

create policy "users can create own challenges"
on "Challenge" for insert
to authenticated
with check ("creatorId" = auth.uid()::text);

create policy "challenge participants can update challenges"
on "Challenge" for update
to authenticated
using (
  exists (
    select 1 from "ChallengeParticipant" cp
    where cp."challengeId" = id
    and cp."userId" = auth.uid()::text
  )
);

create policy "users can read own challenge participant rows"
on "ChallengeParticipant" for select
to authenticated
using ("userId" = auth.uid()::text);

create policy "users can insert own challenge participant rows"
on "ChallengeParticipant" for insert
to authenticated
with check ("userId" = auth.uid()::text);

create policy "users can update own challenge participant rows"
on "ChallengeParticipant" for update
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "authenticated users can read daily quest catalog"
on "DailyQuestCatalog" for select
to authenticated
using (true);

create policy "owner all daily quests"
on "StudentDailyQuest" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "authenticated users can read active vocab words"
on "VocabWord" for select
to authenticated
using (active = true);

create policy "owner all word subscriptions"
on "WordSubscription" for all
to authenticated
using ("userId" = auth.uid()::text)
with check ("userId" = auth.uid()::text);

create policy "owner read word delivery logs"
on "WordDeliveryLog" for select
to authenticated
using ("userId" = auth.uid()::text);
