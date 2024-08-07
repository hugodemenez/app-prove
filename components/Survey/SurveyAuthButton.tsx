"use client"

import Link from "next/link"
import { Button } from "../ui/button"
import { redirect, useSearchParams } from "next/navigation"
import { User } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/clients"
import { Github } from "lucide-react"
import React from "react"
import { ReloadIcon } from "@radix-ui/react-icons"
import { getWebsiteURL } from "@/lib/utils"

export default function SurveyAuthButton({ user }: { user: null | User }) {
    // Check if there is a code in the URL
    const searchParams = useSearchParams()
    const code = searchParams.get('code')
    if (code) {
        // If there is a code, we call auth/callback to exchange it for a session
        // and then redirect to start page
        redirect(`/auth/callback?code=${code}&next=/survey/start/`)
    }
    const [authenticating, setAuthenticating] = React.useState(false)

    return (
        <>
            {
                user ?
                    <Link href={"survey/start"} className="flex self-end">
                        < Button className="flex self-end" >Start survey</Button >
                    </Link >
                    :
                    <div className="flex flex-col gap-y-4 w-fit self-end">
                        <Button onClick={async () => {
                            setAuthenticating(true)
                            const supabase = createClient();
                            await supabase.auth.signInWithOAuth({
                                provider: 'github',
                                options: {
                                    redirectTo: `${getWebsiteURL()}survey/`,
                                },
                            })
                        }}>
                        {!authenticating?
                            <>
                            Use your <span className="flex mx-2 items-center"> <Github />Github</span> account to answer
                            </>
                    :
                            <>
                                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                                <p className="block">Please wait</p>
                            </>
                    }
                            </Button>

                    </div>
            }
        <Link className="self-end" href="/survey/start?anonymous=yes">
        <Button className="self-end" variant={'link'}>Answer anonymously</Button>
        </Link>
        </>
    )
}