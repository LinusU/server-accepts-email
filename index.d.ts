declare namespace serverAcceptsEmail {
  interface Options {
    senderDomain?: string
    senderAddress?: string
  }
}

declare function serverAcceptsEmail (email: string, options?: serverAcceptsEmail.Options): Promise<boolean>

export = serverAcceptsEmail
