import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/server";
import { Search } from "lucide-react";

export default async function OffersPage() {

    const resultNumber = 10;
    const offers = [
        {
            url: "steinprograms",
            title: "SteinPrograms/trading-algorithm",
            badges: ["C++", "Python", "API", "Trading"],
            description: "Evolving in the trading sector, we are developing robust algorithms in C++. Our software needs to be reliable and verified by different entities to ensure extreme reliability.",
            budget: '1000',

        },
    ]
    // get offers from db here
    const supabase = createClient();
    const { data, error } = await supabase.from('offers').select('*').eq('payment_status', 'complete');
    // combine offers from db and offers from the array
    offers.push(...(data as any[])?.map(offer => ({
        url: offer.id,
        title: offer.url,
        badges: offer.keywords.split(','),
        description: offer.description,
        budget: offer.budget,
    })))

    let USDollar = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    return (
        <div className="flex gap-6 flex-col md:flex-row">
            <div className="flex w-full md:w-fit self-start items-center text-nowrap gap-2">
                <form className="flex-1 flex-shrink-0 w-full">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by keyword"
                            className="w-full appearance-none bg-background pl-8 shadow-none "
                        />
                    </div>
                </form>
                <p className="flex-shrink">{offers.length} Results</p>
            </div>
            <div className="flex-1 flex flex-col gap-6">
                {offers.map(offer => (
                    <Link key={offer.title} href={"/offers/" + offer.url}>
                        <Card className=" hover:border-black hover:cursor-pointer">
                            <CardHeader>
                                <div className="flex justify-between w-full">
                                    <div className="flex gap-4 w-full">
                                        <div className="self-center flex-shrink-0">
                                            <Image className='rounded-sm' width={64} height={64} src={"https://github.com/" + offer.title.toLowerCase().split('/')[0] + ".png"} alt={"logo-" + offer.title}></Image>
                                        </div>
                                        <div className="flex gap-2 flex-col w-full">
                                            <div className="flex flex-col sm:flex-row justify-between items-center">
                                                <CardTitle className="self-start flex flex-wrap">
                                                    {offer.title.split('/')[0]}
                                                    <p className="font-normal text-muted-foreground">
                                                        {'/' + offer.title.split('/')[1]}
                                                    </p>
                                                </CardTitle>
                                                <p className="self-start sm:flex-end">{USDollar.format(Number(offer.budget))}</p>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {offer.badges.map(badge => (
                                                    <Badge className="rounded-sm" variant='secondary' key={badge}>{badge}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex items-center gap-2 sm:gap-24 justify-between flex-col sm:flex-row">
                                <CardDescription className="w-full text-pretty text-lg">
                                    {offer.description}
                                </CardDescription>
                                <div className="text-nowrap flex gap-2 items-center self-end sm:self-auto text-sm">
                                    <p>Show more</p>
                                    <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13 1.6004L2 1.59998M13 1.6004L1.5 12.0004M13 1.6004V12.4004" stroke="black" strokeWidth="2" />
                                    </svg>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
