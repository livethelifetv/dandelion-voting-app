import React, { useCallback, useMemo } from 'react'
import {
  AragonApi,
  useApi,
  useAppState,
  usePath,
  useGuiStyle,
} from '@aragon/api-react'
import appStateReducer from './app-state-reducer'
import { EMPTY_CALLSCRIPT } from './evmscript-utils'
import usePanelState from './hooks/usePanelState'
import useVotes from './hooks/useVotes'
import { noop } from './utils'
import { VOTE_YEA } from './vote-types'

const VOTE_ID_PATH_RE = /^\/vote\/([0-9]+)\/?$/
const NO_VOTE_ID = '-1'

function voteIdFromPath(path) {
  if (!path) {
    return NO_VOTE_ID
  }
  const matches = path.match(VOTE_ID_PATH_RE)
  return matches ? matches[1] : NO_VOTE_ID
}

// Get the vote currently selected, or null otherwise.
export function useSelectedVote(votes) {
  const [path, requestPath] = usePath()
  const { ready } = useAppState()

  // The memoized vote currently selected.
  const selectedVote = useMemo(() => {
    const voteId = voteIdFromPath(path)
    // The `ready` check prevents a vote to be selected
    // until the app state is fully ready.
    if (!ready || voteId === NO_VOTE_ID) {
      return null
    }
    return votes.find(vote => vote.voteId === voteId) || null
  }, [path, votes, ready])

  const selectVote = useCallback(
    voteId => {
      requestPath(String(voteId) === NO_VOTE_ID ? '' : `/vote/${voteId}/`)
    },
    [requestPath]
  )

  return [
    selectedVote,

    // setSelectedVoteId() is exported directly: since `selectedVoteId` is
    // set in the `selectedVote` dependencies, it means that the useMemo()
    // will be updated every time `selectedVoteId` changes.
    selectVote,
  ]
}

// Create a new vote
export function useCreateVoteAction(onDone = noop) {
  const api = useApi()
  return useCallback(
    question => {
      if (api) {
        // Don't care about response
        api.newVote(EMPTY_CALLSCRIPT, question, true).toPromise()
        onDone()
      }
    },
    [api, onDone]
  )
}

// Vote (the action) on a vote
export function useVoteAction(onDone = noop) {
  const api = useApi()
  return useCallback(
    (voteId, voteType) => {
      // Don't care about response
      api.vote(voteId, voteType === VOTE_YEA).toPromise()
      onDone()
    },
    [api, onDone]
  )
}

// Execute a vote
export function useExecuteAction(onDone = noop) {
  const api = useApi()
  return useCallback(
    voteId => {
      // Don't care about response
      api.executeVote(voteId).toPromise()
      onDone()
    },
    [api, onDone]
  )
}

// Handles the main logic of the app.
export function useAppLogic() {
  const { isSyncing, ready } = useAppState()
  const [votes, executionTargets, blockHasLoaded] = useVotes()
  const [selectedVote, selectVote] = useSelectedVote(votes)
  const newVotePanel = usePanelState()

  const actions = {
    createVote: useCreateVoteAction(newVotePanel.requestClose),
    vote: useVoteAction(),
    execute: useExecuteAction(),
  }

  return {
    actions,
    executionTargets,
    selectVote,
    selectedVote,
    votes,
    isSyncing: isSyncing || !ready || !blockHasLoaded,
    newVotePanel: useMemo(() => newVotePanel, [newVotePanel]),
  }
}

export function AppLogicProvider({ children }) {
  return <AragonApi reducer={appStateReducer}>{children}</AragonApi>
}

export { useGuiStyle }
