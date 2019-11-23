declare namespace serverAcceptsEmail {
  interface Options {
    /** Domain to identify as (in `HELO` smtp command) */
    senderDomain?: string

    /** Email address to identify as (in `MAIL FROM` command) */
    senderAddress?: string
  }
}

/**
 * @param email - Email address to test
 * @returns Wether or not email is accepted for the given address
 */
declare function serverAcceptsEmail (email: string, options?: serverAcceptsEmail.Options): Promise<boolean>

export = serverAcceptsEmail
