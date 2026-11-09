import { createContext, useContext } from 'react'

/** App lock setting for the signed-in account: { config: { pinHash, pinLength } | null, ready } */
export const AppLockContext = createContext({ config: null, ready: false })
export const useAppLock = () => useContext(AppLockContext)
