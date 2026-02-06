# Leverage & Payoff

> **Module:** 04: Futures Trading  
> **Chapter:** 4  
> **Reading Time:** ~15 minutes  
> **Source:** [Zerodha Varsity](https://zerodha.com/varsity/chapter/leverage-payoff/)  
> **Last Updated:** February 4, 2026

---

Futures Leverage & Payoff: How Margin Trading Works 

	Futures Leverage & Payoff: How Margin Trading Works

img:is([sizes=auto i],[sizes^="auto," i]){contain-intrinsic-size:3000px 1500px}
/*# sourceURL=wp-img-auto-sizes-contain-inline-css */

	img.wp-smiley, img.emoji {
		display: inline !important;
		border: none !important;
		box-shadow: none !important;
		height: 1em !important;
		width: 1em !important;
		margin: 0 0.07em !important;
		vertical-align: -0.1em !important;
		background: none !important;
		padding: 0 !important;
	}
/*# sourceURL=wp-emoji-styles-inline-css */

:root{--wp-block-synced-color:#7a00df;--wp-block-synced-color--rgb:122,0,223;--wp-bound-block-color:var(--wp-block-synced-color);--wp-editor-canvas-background:#ddd;--wp-admin-theme-color:#007cba;--wp-admin-theme-color--rgb:0,124,186;--wp-admin-theme-color-darker-10:#006ba1;--wp-admin-theme-color-darker-10--rgb:0,107,160.5;--wp-admin-theme-color-darker-20:#005a87;--wp-admin-theme-color-darker-20--rgb:0,90,135;--wp-admin-border-width-focus:2px}@media (min-resolution:192dpi){:root{--wp-admin-border-width-focus:1.5px}}.wp-element-button{cursor:pointer}:root .has-very-light-gray-background-color{background-color:#eee}:root .has-very-dark-gray-background-color{background-color:#313131}:root .has-very-light-gray-color{color:#eee}:root .has-very-dark-gray-color{color:#313131}:root .has-vivid-green-cyan-to-vivid-cyan-blue-gradient-background{background:linear-gradient(135deg,#00d084,#0693e3)}:root .has-purple-crush-gradient-background{background:linear-gradient(135deg,#34e2e4,#4721fb 50%,#ab1dfe)}:root .has-hazy-dawn-gradient-background{background:linear-gradient(135deg,#faaca8,#dad0ec)}:root .has-subdued-olive-gradient-background{background:linear-gradient(135deg,#fafae1,#67a671)}:root .has-atomic-cream-gradient-background{background:linear-gradient(135deg,#fdd79a,#004a59)}:root .has-nightshade-gradient-background{background:linear-gradient(135deg,#330968,#31cdcf)}:root .has-midnight-gradient-background{background:linear-gradient(135deg,#020381,#2874fc)}:root{--wp--preset--font-size--normal:16px;--wp--preset--font-size--huge:42px}.has-regular-font-size{font-size:1em}.has-larger-font-size{font-size:2.625em}.has-normal-font-size{font-size:var(--wp--preset--font-size--normal)}.has-huge-font-size{font-size:var(--wp--preset--font-size--huge)}.has-text-align-center{text-align:center}.has-text-align-left{text-align:left}.has-text-align-right{text-align:right}.has-fit-text{white-space:nowrap!important}#end-resizable-editor-section{display:none}.aligncenter{clear:both}.items-justified-left{justify-content:flex-start}.items-justified-center{justify-content:center}.items-justified-right{justify-content:flex-end}.items-justified-space-between{justify-content:space-between}.screen-reader-text{border:0;clip-path:inset(50%);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;width:1px;word-wrap:normal!important}.screen-reader-text:focus{background-color:#ddd;clip-path:none;color:#444;display:block;font-size:1em;height:auto;left:5px;line-height:normal;padding:15px 23px 14px;text-decoration:none;top:5px;width:auto;z-index:100000}html :where(.has-border-color){border-style:solid}html :where([style*=border-top-color]){border-top-style:solid}html :where([style*=border-right-color]){border-right-style:solid}html :where([style*=border-bottom-color]){border-bottom-style:solid}html :where([style*=border-left-color]){border-left-style:solid}html :where([style*=border-width]){border-style:solid}html :where([style*=border-top-width]){border-top-style:solid}html :where([style*=border-right-width]){border-right-style:solid}html :where([style*=border-bottom-width]){border-bottom-style:solid}html :where([style*=border-left-width]){border-left-style:solid}html :where(img[class*=wp-image-]){height:auto;max-width:100%}:where(figure){margin:0 0 1em}html :where(.is-position-sticky){--wp-admin--admin-bar--position-offset:var(--wp-admin--admin-bar--height,0px)}@media screen and (max-width:600px){html :where(.is-position-sticky){--wp-admin--admin-bar--position-offset:0px}}
/*wp_block_styles_on_demand_placeholder:698341544b8db*/
/*# sourceURL=wp-block-library-inline-css */

/*! This file is auto-generated */
.wp-block-button__link{color:#fff;background-color:#32373c;border-radius:9999px;box-shadow:none;text-decoration:none;padding:calc(.667em + 2px) calc(1.333em + 2px);font-size:1.125em}.wp-block-file__button{background:#32373c;color:#fff;text-decoration:none}
/*# sourceURL=/wp-includes/css/classic-themes.min.css */

			@media screen and (max-width: 650px)
{
	#header .menu li {
        display: block;
        margin: 0 35px 15px 0;
        text-align: end;
	}
}		

![](https://zerodha.com/varsity/wp-content/themes/varsity2/images/logo.png)

![](https://zerodha.com/varsity/wp-content/themes/varsity2/images/logo-small.png)

				[☰]()
				
- [Modules](https://zerodha.com/varsity/modules/)

- [Videos](https://zerodha.com/varsity/video-modules/)

- [Newsletter](https://zerodhavarsity.substack.com/)

- [Junior](https://zerodha.com/varsity/chapter/episode-1-ideas-by-the-lake/)

- [Events](https://zerodha.com/varsity/events/)

- [Live](https://varsitylive.zerodha.com/home)

			 -->

						 Module 4.
						Futures Trading					

									1								
								
									Background - Forwards Market								

									2								
								
									Introducing Futures Contract								

									3								
								
									The Futures Trade								

									4								
								
									Leverage &#038; Payoff								

									5								
								
									Margin &#038; M2M								

									6								
								
									Margin Calculator (Part 1)								

									7								
								
									Margin Calculator (Part 2)								

									8								
								
									All about Shorting								

									9								
								
									The Nifty Futures								

									10								
								
									The Futures Pricing								

									11								
								
									Hedging with Futures								

									12								
								
									Open Interest								

									13								
								
									Quick Note on Physical Settlement								

				[4. Leverage &#038; Payoff](https://zerodha.com/varsity/chapter/leverage-payoff/)

									[&larr; Previous](https://zerodha.com/varsity/chapter/futures-trade/)
								[Chapters](https://zerodha.com/varsity/module/futures-trading/)
									[Next &rarr;](https://zerodha.com/varsity/chapter/margin-m2m/)

## 4.1 – A quick recap

With the Tata Consultancy Services (TCS) example in the previous chapter, we got a working knowledge of how Futures trading works. The futures trade example required us to go long on TCS futures as the expectation was that the TCS stock price would increase in due course. Further, we decided to square off the contract the very next day for a profit. However, if you recall, right at the beginning of the example, we posed a fundamental question; let me rephrase and repost the same for your ready reference.

A rational to go long on TCS was built – the thought was that TCS stock price had overreacted to the management’s statement. I expected the stock price to increase in due course of time. A directional view was established, and hence a futures trade was initiated. The question was – anyway, the expectation is that the stock price will go higher, why should one bother about buying futures and why not the stock in the spot market?

In fact, buying futures requires one to enter a digital agreement with the counterparty. Besides, a futures agreement is time-bound, meaning the directional view has to pan out within the specified time period. If it does not pan out within the specified time (as in the expiry), one has to suffer a loss. Contrast this (futures buying) with just buying stock and letting it reside in your DEMAT account. There is no obligation of an agreement or the pressure of time. So why does one really need futures? What makes it so attractive? Why not just buy the stock and stay oblivious to the stock price and the time?

The answers to all these questions lie in the financial leverage inherent in financial derivatives, including futures. As they say, Leverage is a true financial innovation; if used in the right context and spirit, leverage can create wealth. Without much ado, let us explore this angle of futures trading.

## 4.2 – Leverage in perspective

Leverage is something we use at some point or the other in our lives. We don’t think about it in the way it is supposed to be thought about. We miss seeing through the numbers and therefore never really appreciate the essence of leverage.

Here is a classic example of leverage – many of you may relate to this one.

A friend of mine is a real estate trader; he likes to buy apartments, sites, and buildings, hold them for a while, and then sell them for a later stage. He believes this is better than trading inequities, and I beg to differ – I could go on and on debating this, but maybe some other time.

Anyway, here is a summary of a recent real estate transaction he carried out. In November 2013, Prestige Builders (popular builders in Bangalore) identified land in South Bangalore. They announced a new project – A luxurious apartment complex with state of the art amenities. My friend jumped in and booked a 2 bedroom, hall, and kitchen apartment, expected to come up on the 9th floor for a sum of Rs.10,000,000/-. The project is expected to be completed by mid-2018. Since the apartment was just notified, and no work had started, the potential buyers were only required to pay 10% of the actual buy value. This is pretty much the norm when it comes to buying brand new apartments. The remaining 90% was scheduled to be paid as the construction progressed.

So back in Nov 2013, for an initial cash outlay of Rs.10,00,000/- (10% of 10,000,000/-), my friend was entitled to buy a property worth Rs.10,000,000/-. In fact, the property was so hot; all the 120 apartments were sold out like hot cakes just within 2 months of Prestige Builder announcing the brand new project.

Fast forward to Dec 2014, and my friend had a potential buyer for his apartment. Being a real estate trader, my friend jumped into the opportunity. A quick survey revealed that the area's property value had appreciated by at least 25% (well, that’s how crazy real estate is in Bangalore). So my friend’s 9th-floor apartment was now valued at Rs.12,500,000/-. My friend and the potential buyer struck a deal and settled on the sale at Rs.12,500,000/-.

Here is a table summarizing the transaction –

| **Particulars** 
| **Details** 

| Initial Value of Apartment 
| Rs. 10,000,000/- 

| Date of Purchase 
| November 2013 

| Initial Cash outlay @ 10% of the apartment value 
| Rs.10,00,000/- 

| Balance Payment to Builder 
| Rs.90,00,000/- 

| Appreciation in apartment value 
| 25% 

| Value of the apartment in Dec 2014 
| Rs.12,500,000/- 

| New buyer agrees to pay the balance payment 
| Rs.90,00,000/- to the builder 

| My friend gets paid 
| 12,500,000 – 9000000 = **Rs.35,00,000/-** 

| My friend’s profit on the transaction 
| Rs.35,00,000/- minus Rs.10,00,000/- = **Rs.25,00,000/-** 

| Return on investment 
| 25,00,000 / 10,00,000 = **250%** 

Clearly, few things stand out in this transaction.

- My friend was able to participate in a **large transaction** by paying only 10% of the transaction value.

- To enter into the transaction, my friend had to pay 10% of the actual value (call it the contract value)

- The initial value he pays (10 lakhs) can be considered a token advance, or in terms of ‘Futures Agreement,’ it would be the initial margin deposit.

- A small change in the asset value impacts the return massively.

- This is quite obvious – a 25% increase in asset value resulted in a 250% return on investment.

- A transaction of this type is called a “**Leveraged Transaction.**”

Do make sure you understand this example thoroughly because this is very similar to a futures trade, as all futures transactions are leveraged. Do keep this example in perspective as we will now move back to the TCS trade.

![M4-Ch4-title](http://zerodha.com/varsity/wp-content/uploads/2015/01/M4-Ch4-title.jpg)

## 4.3 – The Leverage

While we looked at the futures trade's overall structure in the previous chapter, let us now re-work the TCS example with some specific details. For the sake of simplicity, the trade details are as follows: we will assume the opportunity to buy TCS occurs on the 15th of Dec at Rs.2362/- per share. Further, we will assume the opportunity to square off this position occurs on 23rd Dec 2014 at Rs.2519/-. Also, we will assume there is no difference between the spot and futures price.

| **Particulars** 
| **Details** 

| Underlying 
| TCS Limited 

| Directional View 
| Bullish 

| Action 
| Buy 

| Capital available for the trade 
| Rs.100,000/- 

| Trade Type 
| Short term 

| Remarks 
| The expectation is that the stock price will increase over the next few days 

| By Date 
| 15th Dec 2014 

| Approximate buy Price 
| Rs.2362/- per share 

| Sell Date 
| 23rd Dec 2014 

| Approximate Sell Price 
| Rs.2519/- per share 

So with a bullish view on TCS stock price and Rs.100,000/ in hand, we have to decide between the two options at our disposal - **Option 1** - Buy TCS stock in the spot market or **Option 2** - Buy TCS futures from the Derivatives market. Let us evaluate each option to understand the respective dynamics.

**Option 1** – Buy TCS Stock in the spot market

Buying TCS in the spot market requires us to check for the price at which the stock is trading and calculate the number of stocks we can afford to buy (with the capital at our disposal). After buying the stock in the spot market, we have to wait for at least two working days (T+2) to get credited to our DEMAT account. Once the stocks reside in the DEMAT account, we just have to wait for the right opportunity to sell them.

Few salient features of buying the stock in the spot market (delivery based buying) –

- Once we buy the stock (for delivery to DEMAT), we have to wait for at least 2 working days before deciding to sell it. This means even if the very next day, if a good opportunity to sell comes up, we cannot really sell the stock.

- We can buy the stock to the extent of the capital at our disposal. Meaning if our disposable cash is Rs.100,000/- we can only buy to the extent of Rs.100,000/- not beyond this.

- There is no pressure of time – as long as one has the time and patience, one can wait for a really long time before deciding to sell

Specifically, with Rs.100,000/- at our disposal, on 15th Dec 2014, we can buy –

= 100,000 / 2362

~ 42 shares

Now, on 23rd Dec 2014, when TCS is trading at Rs.2519/- we can square off the position for a profit –

= 42 * 2519

= Rs.105,798/-

So Rs.100,000/- invested in TCS on 14th Dec 2014 has now turned into Rs.105,798/- on 23rd Dec 2014, generating Rs.5,798/- in profits. Interesting, let us check the return generated by this trade –

= [5798/100,000] * 100

= 5.79 %

A 5.79% return over 9 days is quite impressive. In fact, a 9-day return of 5.79% when annualized yields about 235%. This is phenomenal!

But how does this contrast with option 2?

**Option 2** – Buy TCS Stock in the futures market

Recall in futures market variables are predetermined. For instance, the minimum number of shares (lot size) that needs to be bought in TCS is 125 or in multiples of 125. The lot size multiplied by the futures price gives us the ‘contract value’. We know the futures price is Rs.2362/- per share; hence the contract value is –

= 125 * 2362

= Rs.295,250/-

Does that mean to participate in the futures market, I need Rs.295,250/- in total cash? Not really; Rs. 295,250/- is the contract value; however, to participate in the futures market, one just needs to deposit a margin amount which is a certain % of the contract value. In the case of TCS futures, we need about 14% margin. At 14% margin (14% of Rs.295,250/-), Rs.41,335/- is all we need to enter into a futures agreement. At this stage, you may get the following questions in your mind -

What about the balance money? i.e Rs.253,915/- ( Rs.295,250/ minus Rs.41,335/-)

- Well, that money is never really paid out.

What do I mean by ‘never really paid out’?

- We will understand this in greater clarity when we take up the chapter on “Settlement - mark 2 markets.”

Is 14% fixed for all stocks?

- No, it varies from stock to stock.

So, keeping these few points in perspective, let us explore the futures trade further. The cash available in hand is Rs.100,000/-. However, the cash requirement in terms of margin amount is just Rs. Rs.41,335/-.

This means instead of 1 lot, maybe we can buy 2 lots of TCS futures. With 2 lots of TCS futures, the number of shares would be 250 (125 * 2) - at the cost of Rs.82,670/- as the margin requirement. After committing Rs.82,670/- as margin amount for 2 lots, we would still be left with Rs.17,330/- in cash. But we cannot really do anything with this money; hence it is best left untouched.

Now here is how the TCS futures equation stacks up –

Lot Size – 125

No of lots – 2

Futures Buy price – Rs. 2362/-

Futures Contract Value at the time of buying = Lot size *number of lots* Futures Buy Price

= 125 * 2 * Rs. 2362/-

= Rs. 590,500/-

Margin Amount - Rs.82,670/-

Futures Sell price = Rs.2519/-

Futures Contract Value at the time of selling = 125 * 2 * 2519

= Rs.629,750/-

This translates to a profit of Rs. 39,250/-!

Can you see the difference? A move from 2361 to 2519 generated a profit of Rs.5,798/- in the spot market, but the same move generated Rs' profit. 39,250/-. Let us see how juicy this looks in terms of % return.

Remember our investment for the futures trade is Rs.82,670/-, hence the return has to be calculated keeping this as the base –

[39,250 / 82,670]*100

Well, this translates to a whopping 47% over 9 days! Contrast that with 5.79% in the spot market. For the sake of annualizing, this translates to an annual return of 1925 % …. With this, hopefully, I should have convinced you why short term traders prefer transactions in the Futures market as opposed to spot market transactions.

Futures offer something more than a plain vanilla spot market transaction. Thanks to the existence of ‘Margins’, you require a much lesser amount to enter into a relatively large transaction. If your directional view is right, your profits can be huge.

We can take positions much bigger than the capital available; this is called “Leverage”. Leverage is a double-edged sword. If used in the right spirit and knowledge, leverage can create wealth; if not, it can destroy wealth.

Before we proceed further, let us just summarize the contrast between the spot and futures market in the following table –

| **Particular** 
| **Spot Market** 
| **Futures Markets** 

| Capital Available 
| Rs.100,000/- 
| Rs.100,000/- 

| By Date 
| 15th Dec 2014 
| 15th Dec 2014 

| Buy Price 
| Rs.2362 per share 
| Rs.2362 per share 

| Qty 
| 100,000 / 2362 = 42 shares 
| Depends on Lot size 

| Lot Size 
| Not Applicable 
| 125 

| Margin 
| Not Applicable 
| 14% 

| Contract value per lot 
| Not Applicable 
| 125 * 2362 = 295,250/- 

| Margin Deposit per lot 
| Not Applicable 
| 14% * 295,250 = 41,335/- 

| How many lots can be bought 
| Not Applicable 
| 100,000/41,335= 2.4 or 2 Lots 

| Margin Deposit 
| Not Applicable 
| 41,335 * 2 = 82,670/- 

| No of shares bought 
| 42 (as calculated above) 
| 125 * 2 = 250 

| Buy Value (Contract Value) 
| 42 * 2362 = 100,000/- 
| 2 * 125 * 2362 = 590,500/- 

| Sell Date 
| 23rd Dec 2014 
| 23rd Dec 2014 

| No of days trade was live 
| 9 days 
| 9 days 

| Sell Price 
| Rs.2519/- per share 
| Rs.2519/- per share 

| Sell Value 
| 42 * 2519 = 105,798 
| 250 * 2519 = 629,750/- 

| Profit earned 
| 105798 – 100000 = Rs.5798/- 
| 629750 – 590500 = Rs.39,250/- 

| Absolute Return for 9 days 
| 5798 / 100,000 = 5.79 % 
| 39250 / 82670 = 47% 

| % Return annualized 
| 235% 
| 1925% 

All through, we have discussed rewards of transacting in futures, but what about the risk involved? What if the directional view does not pan out as expected? To understand both the sides of a futures trade, we need to understand how much money we stand to make (or lose) based on the underlying movement. This is called the “Futures Payoff”.

## 4.4 – Leverage Calculation

Usually, when we talk about leverage, the common questions one gets asked is – “How many times leverage are you exposed to?” The higher the leverage, the higher is the risk, and the higher is the profit potential.

Calculating leverage is quite easy –

**Leverage = [Contract Value/Margin]**. Hence for TCS trade the leverage is

= [295,250/41,335]

= 7.14, which is read as 7.14 times or simply as a ratio – 1: 7.14.

This means every Rs.1/- in the trading account can buy upto Rs.7.14/- worth of TCS. This is a very manageable ratio. However, if the leverage increases, then the risk also increases. Allow me to explain.

At 7.14 times leverage, TCS has to fall by 14% for one to lose all the margin amount; this can be calculated as –

**1 / Leverage**

= 1/ 7.14

= 14%

Now for a moment, assume the margin requirement was just Rs.7000/- instead of Rs.41,335/-. In this case, the leverage would be –

= 295,250 / 7000

= 42.17 times

This is clearly is a very high leverage ratio. One will lose all his capital if TCS falls by –

1/41.17

= 2.3%.

So, the higher the leverage, the higher is the risk. When leverage is high, only a small move in the underlying is required to wipe out the margin deposit.

Alternatively, at roughly 42 times leverage, you just need a 2.3% move in the underlying to double your money.☺

I personally don’t like to over-leverage. I stick to trades where the leverage is about 1:10 or about 1:12, not beyond this.

## 4.5 – The Futures payoff

Imagine this – when I bought TCS futures, the expectation was that TCS stock price would go higher, and therefore, I would financially benefit from the futures transaction. But what if instead of going up, TCS stock price went down? I would obviously make a loss. Think about it after initiating a futures trade. At every price point, I would either stand to make a profit or loss. The payoff structure of a futures transaction simply highlights the extent to which I either make a profit or loss at various possible price points.

To understand the payoff structure better, let us build one for the TCS trade. Remember it is a long trade initiated at Rs.2362/- on 16th of Dec. After initiating the trade, by 23rd Dec, the price of TCS can go anywhere. Like I mentioned, at every price point, I will either make a profit or a loss. Hence while building the structure's pay, I will assume various possible price point situations that can pan out by 23rd Dec, and I will analyze the P&L situation at each of these possibilities. In fact, the table below does the same -

| **Possible Price on 23rd Dec** 
| **Buyer P&L (Price on 23rd Dec - Buy Price)** 

| 2160 
| (202) 

| 2180 
| (182) 

| 2200 
| (162) 

| 2220 
| (142) 

| 2240 
| (122) 

| 2260 
| (102) 

| 2280 
| (82) 

| 2300 
| (62) 

| 2320 
| (42) 

| 2340 
| (22) 

| 2360 
| (2) 

| 2380 
| 18 

| 2400 
| 38 

| 2420 
| 58 

| 2440 
| 78 

| 2460 
| 98 

| 2480 
| 118 

| 2500 
| 138 

| 2520 
| 158 

| 2540 
| 178 

| 2560 
| 198 

| 2580 
| 218 

| 2600 
| 238 

This is the way you need to read this table – considering you are a buyer at Rs.2362/-, what would be the P&L by 23rd Dec assuming TCS is trading is Rs.2160/-. As the table suggests, you would make a loss of Rs.202/-per share (2362 - 2160).

Likewise, what would be your P&L if TCS is trading at 2600? Well, as the table suggest, you would make a profit of Rs.238/- per share (2600 – 2362). So on and so forth.

In fact, if you recollect from the previous chapter, we stated that if the buyer is making Rs. X/- as profit, then the seller is suffering a loss to the extent of Rs. X/-. So assuming  23rd Dec TCS is Trading at 2600, the buyer makes a profit of Rs.238/- per share, and the seller would be making a loss of Rs.238/- per share, provided that the seller has shorted the share at Rs.2362/-.

Another way to look at this is that the money is being transferred from the seller’s pocket to the buyer’s pocket. It is just a transfer of money and not a creation of money!

There is a difference between the transfer of money and creation of money. Money is generated when the value is created. For example, you have bought TCS shares from a long term perspective, TCS as a business does well, profits and margins improve. Obviously, you as a shareholder will benefit from under-appreciation in the share price. This is money creation or wealth generation. If you contrast this with Futures, money is not being created but moving from one pocket to another.

Precisely for this reasons, Futures (rather financial derivatives in general) is called a “**Zero Sum Game**”.

Further, let us now plot a graph of the possible price on 23rd December versus the buyers P&L. This is also called the **“Payoff Structure”.**

![M4-Ch4-Chart1](http://zerodha.com/varsity/wp-content/uploads/2015/01/M4-Ch4-Chart11.png)

As you can see, any price above the buy price (2362) results in a profit and any price below the buy price results in a loss. Since the trade involved purchasing 2 lots of futures (250 shares), a 1 point positive movement (from 2362 to 2363) results in a gain of Rs.250. Likewise, a 1 point negative movement (from 2362 to 2361) results in a loss of Rs.250. Clearly, there is a sense of proportionality here. The proportionality comes from the fact that the money made by the buyer is the loss suffered by the seller (provided they have bought/short the same price), and vice versa.

Most importantly, because the P&L is a smooth straight line, it is said that the futures are a “**Linear Payoff Instrument**”.

### Key takeaways from this chapter

- Leverage plays a key role in futures trading.

- Margins allow us to deposit a small amount of money and take exposure to a large value transaction.

- Margins charged is usually a % of the contract value.

- Spot market transactions are not leveraged; we can transact to the extent of our capital.

- Under leverage, a small change in the underlying results in a massive impact on the P&L

- The profits made by the buyer is equivalent to the loss made by the seller and vice versa.

- The higher the leverage, the higher is the risk and, therefore, the higher the chance of making money.

- Futures Instrument simply allows one to transfer money from one pocket to another. Hence it is called a “Zero Sum Game.”

- The payoff structure of a futures instrument is linear.

					[&larr; Previous](https://zerodha.com/varsity/chapter/futures-trade/)
				[Chapters](https://zerodha.com/varsity/module/futures-trading/)
					[Next &rarr;](https://zerodha.com/varsity/chapter/margin-m2m/)

		[578](https://zerodha.com/varsity/chapter/leverage-payoff/#comments)
		[comments](https://zerodha.com/varsity/chapter/leverage-payoff/#comments)	

						Sudhi says:		

			[November 24, 2025 at 11:27 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-579881)		

Hi Karthik ,

Question 1:
Just like pair trading you have explained in Trading systems chapter , how can we mathematically /statistically predict the price direction.
question 2 :
For beginners , is Pair trading better that single stakes ? reason is there is some maths behind it.And it is market neutral.

Thanks

		[Reply](#comment-579881)

						Karthik Rangappa says:		

			[November 25, 2025 at 11:34 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-579937)		

		1) There are few statistical techniques like GARCH models. I\'ve not explored them, so cant really comment 🙂
2) Yes and no 🙂 The margin requirements are quite a bit and the SL can be quite deep.

		[Reply](#comment-579937)

						Savita says:		

			[October 9, 2025 at 2:45 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-576674)		

		you said in the chapter that once we buy the stock (for delivery to DEMAT), we have to wait for at least 2 working days before deciding to sell it. This means even if the very next day, if a good opportunity to sell comes up, we cannot really sell the stock\"
But I have sold stock many times after bought yesterday. How could this happen and does full amount credited to our trading account if we sell shares next day..

		[Reply](#comment-576674)

						Karthik Rangappa says:		

			[October 10, 2025 at 2:46 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-576751)		

You can sell it the next day, Savita. This is called the BTST (Buy today, sell t\'row) trade. But you cant do BTST with all stocks. Check this - https://zerodha.com/z-connect/general/btstatst-buyacquire-today-sell-tomorrow

		[Reply](#comment-576751)

						Vikram says:		

			[August 5, 2025 at 9:55 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-571512)		

Hello sir, 

1) From 4.4 Leverage calculation, you said that
\"At 7.14 times leverage, TCS has to fall by 14% for one to lose all the margin amount; this can be calculated as –

1 / Leverage

= 1/ 7.14

= 14%  \"

so from this can we infer that if a futures contract falls by its margin percentage, then the futures contract buyer will lose all his margin amount he paid. pls clarify this sir

2) is it possible to buy a stock today and sell it tomorrow in cash market? if yes, is there any additional charges for that? and alos how it\'ll be possible to sell a stock immediately next day as it will reach our DEMAT account only in T + 2 day right sir?

		[Reply](#comment-571512)

						Karthik Rangappa says:		

			[August 7, 2025 at 7:09 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-571638)		

		1) Yes, the point to note is that a small % fall can wipe off 100% of your margins.
2) Yes, you can. Check this - https://support.zerodha.com/category/trading-and-markets/trading-faqs/general/articles/btst-meaning

		[Reply](#comment-571638)

						Aditya says:		

			[July 30, 2025 at 11:42 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-570866)		

Hello Kartik sir Aditya here, while u were giving the example of option 1 of Buying TCS in the spot market if we buy the stock on T day we can sell it till T+2 day ( were u just referring to this example or really we cant do this sir ) becauze how do people do intraday trade then?

		[Reply](#comment-570866)

						Karthik Rangappa says:		

			[July 31, 2025 at 7:52 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-570957)		

Intraday you can easily buy and sell the stock. What I was referring to is for delivery trade.

		[Reply](#comment-570957)

						Prashanth K R says:		

			[February 16, 2025 at 8:32 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-555980)		

		Hi Karthik Sir,
Actually I have learnt about the options first and then came to futures. I have some doubts which i have mentioned one by one.
1. The margins you have mentioned of 41335/-, is same as the premium for the options we use to buy or sell. Right?
2. Sir even if we buy 1 lot of futures with 41335/- then should we need to maintain a margin with the broker seperately like maintaining for the Short call and short put options with the broker?
3. Here in the futures, the delta of the option will remain 1 right? because 1 point increase will result in Rs.1 increase (250 in the TCS example case).
4. Will the retailers have the similar type of strategies like spreads in the futures also?
5. the 14% of the margin amount of the total value is predetermined in the contract Right? If so then the margin will vary from stock to stock. Then TCS will give a normal Leveraged futures contract of 14% (so risk is ok) and other stock will give leverage of 25% (where risk will be high).
Sir Please correct me if I am wrong.

		[Reply](#comment-555980)

						Karthik Rangappa says:		

			[February 17, 2025 at 10:50 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-556027)		

		1) Yes, margins are similar.
2) Yes, margin is applicable for both buying and selling of futures
3) Yes, delta of futures is 1 constant
4) Yes, thats right. Most traders have similar strategies
5) Yes, margins are dependent of the contract value, hence there could be variations in margins.

		[Reply](#comment-556027)

						Niraj desai says:		

			[December 5, 2024 at 11:14 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-550294)		

In rollover we have one benifit that is buying price.

		[Reply](#comment-550294)

						Karthik Rangappa says:		

			[December 6, 2024 at 12:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-550368)		

How is that a benefit?

		[Reply](#comment-550368)

						Niraj desai says:		

			[December 3, 2024 at 12:46 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-550182)		

once the margin become zero due to one downward in spot price the trade will countinue till expiry or it get closed automatically on same day?

		[Reply](#comment-550182)

						Karthik Rangappa says:		

			[December 4, 2024 at 10:06 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-550236)		

Without the required margins, the position gets closed out.

		[Reply](#comment-550236)

						Vaibhav says:		

			[December 1, 2024 at 12:28 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-550090)		

What happens if the loss due to price change in stock price is higher than the margin amount?

		[Reply](#comment-550090)

						Karthik Rangappa says:		

			[December 2, 2024 at 8:59 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-550136)		

Then the amount will be recovered from you by the broker. But chances of this happening is unlikely.

		[Reply](#comment-550136)

						SUBHASHISH BISWAS says:		

			[October 11, 2024 at 12:14 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-535040)		

IT HAS BEEN EXPLAIMED IN A VERY SIMPLE WAY.

		[Reply](#comment-535040)

						Karthik Rangappa says:		

			[October 11, 2024 at 1:45 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-535065)		

Glad you liked it. Happy learning 🙂

		[Reply](#comment-535065)

						Anand Bhide says:		

			[September 28, 2024 at 9:55 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-534314)		

Very nicely explained Sir.Thanks a lot.

		[Reply](#comment-534314)

						Karthik Rangappa says:		

			[September 29, 2024 at 9:42 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-534331)		

Thanks!

		[Reply](#comment-534331)

						Shaan says:		

			[September 14, 2024 at 7:43 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-533318)		

		Hi Karthik,
Just wanted to know why gold guinea futures contract required me to pay 58000 rupees ( whole contract value ) while requiring a margin of 5000 rupees , the concept of leverage seems more blurred now

Please explain me this

		[Reply](#comment-533318)

						Ramesh says:		

			[August 12, 2024 at 5:44 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-530067)		

Thanks for your knowledgeable information to understand the leverages properly.

		[Reply](#comment-530067)

						Karthik Rangappa says:		

			[August 13, 2024 at 10:58 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-530131)		

Happy learning, Ramesh!

		[Reply](#comment-530131)

						Hugo says:		

			[June 19, 2024 at 1:26 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-524857)		

I don\'t think this is a zero sum game - it is a negative sum game. You have all the transaction costs, the cost of the tech/data/education to really have a chance to make money on any given trade.

		[Reply](#comment-524857)

						Karthik Rangappa says:		

			[June 20, 2024 at 10:36 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-524949)		

Yeah true, these are the other costs involved.

		[Reply](#comment-524949)

						Pratap Wagh says:		

			[May 8, 2024 at 5:07 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-521086)		

		Hello Sir, One very critical doubt about futures.
I believe if someone has gained some profit, then someone also has to loss the same amount of money(like here 39,250 was that amount). So in the TCS futures example please explain how and by taking what position the other person is booking loss.
Thanks in advance.

		[Reply](#comment-521086)

						Karthik Rangappa says:		

			[May 9, 2024 at 10:38 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-521128)		

If you are long and make a profit, then it implies the trader who is short on the same instrument is making a loss. Vice versa if you are short.

		[Reply](#comment-521128)

						Ayush says:		

			[March 12, 2024 at 8:04 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-518204)		

Here it is said that in spot market there is no lot size but that is opposite of what I observe.whenver I try to buy in spot market there also that have lot size minimum number of stock to buy. Can you clarify.

		[Reply](#comment-518204)

						Karthik Rangappa says:		

			[March 12, 2024 at 12:06 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-518226)		

Ayush, there is no lot size when it comes to spot market. You can buy to whatever extent you want, even 1 share 🙂

		[Reply](#comment-518226)

						Teju says:		

			[February 22, 2024 at 12:15 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-517316)		

		Hi Sir,
Thank you so much for such a great content.
So total profit of the buyer at the end of DEC 23rd will be
114(Sum of P/L of buyer) x 250(2 lots) = 28500 right?

		[Reply](#comment-517316)

						Karthik Rangappa says:		

			[February 23, 2024 at 1:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-517390)		

Yes, thats right.

		[Reply](#comment-517390)

						sid says:		

			[February 5, 2024 at 9:44 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-515968)		

A question; what is the benefit of new buyer buying apartment from your friend? I mean couldnt he simply get the apartment directly from builder!

		[Reply](#comment-515968)

						Karthik Rangappa says:		

			[February 6, 2024 at 9:55 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-516174)		

Assumption is that nothing else for sale.

		[Reply](#comment-516174)

						Shiju says:		

			[January 7, 2024 at 5:57 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-514624)		

Excellent content. Thanks to the Team.

		[Reply](#comment-514624)

						Karthik Rangappa says:		

			[January 7, 2024 at 11:49 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-514636)		

Happy learning!

		[Reply](#comment-514636)

						naik says:		

			[December 8, 2023 at 5:50 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-512974)		

A 5.79% return over 9 days is quite impressive. In fact, a 9-day return of 5.79% when annualized yields about 235%. This is phenomenal!

		[Reply](#comment-512974)

						Ajith V says:		

			[October 31, 2023 at 11:35 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-510904)		

Hi,

Pls consider this example for INTRADAY trading with leverage :

Total funds in Demat : 30,000

Cost per share : 558
No of shares bought: 150 ( leveraging 53000 ) - Total Cost : 83700
If I sell this share during an intraday session at suppose : 560
Trade Value - 84000.

What would be my profit value selling at ₹560 per share if calculated on leverage ?. 

Eager for your response

		[Reply](#comment-510904)

						Karthik Rangappa says:		

			[November 1, 2023 at 5:51 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-510927)		

		It would be Buy value (8400) minus sell value (83700) = 300 or
Sell price (560) minus buy price (558) multiplied by number of shares i.e. 2*150 = 300.

		[Reply](#comment-510927)

						aarnav says:		

			[October 3, 2023 at 6:05 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-507102)		

Sir in the option 1 section, you\'ve written it takes T+2 days for the stock to reflect in your DEMAT account and it also takes 2 days to sell (basically you cannot sell it before 2 days of buying the stock)&#8230;.hasn\'t this situation changed? SEBI has initiated the T+1 system, please correct me if I\'m wrong.

		[Reply](#comment-507102)

						Karthik Rangappa says:		

			[October 4, 2023 at 7:56 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-507191)		

Yes, we have updated this in Module 1. Settlement is T+1 now.

		[Reply](#comment-507191)

						DR DEVENDRA AGRAWAL says:		

			[September 9, 2023 at 10:15 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-502048)		

it is so wonderful to learn with zerodha varsity. Thanks to all the team members. Karthik sir, i am putting some formulas as i have understood. please correct me where i am wrong. Thanks for your valuable time and thanks again such a good study material.

Leverage is in terms of times or ratio and not percentage
Margin can be in terms of percentage or value
Leverage = contract size value/ margin value
Margin value = contract value / Leverage
Margin % = Margin value / Contract value x 100
Margin % = 100/Leverage
Leverage = 100/Margin % (if margin is in terms of percentage)
         Hence, Leverage = 100/(Margin value x 100/contract value)
         Hence, Leverage = contract value / Margin value
% Margin loss = % loss of contract x Leverage
% Margin loss = % loss of contract x 100/margin%
          1. if % loss of contract = 100/leverage then whole margin will wipe out
          2. if % loss of contract = margin % then whole margin will wipe out

similarly we can calculate % margin profit

Thanks

		[Reply](#comment-502048)

						Karthik Rangappa says:		

			[September 10, 2023 at 8:40 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-502070)		

So margin value is given by the exchange and brokers, you cant really calculate that. So you need to keep that in perspective. For P&L, you need to consider what profit or loss you\'ve made and divide that over the margin you\'ve deposited.

		[Reply](#comment-502070)

						DR DEVENDRA AGRAWAL says:		

			[September 9, 2023 at 5:45 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-502040)		

\"Another way to look at this is that the money is being transferred from the seller’s pocket to the buyer’s pocket. It is just a transfer of money and not a creation of money!

There is a difference between the transfer of money and creation of money. Money is generated when the value is created. For example, you have bought TCS shares from a long term perspective, TCS as a business does well, profits and margins improve. Obviously, you as a shareholder will benefit from under-appreciation in the share price. This is money creation or wealth generation. If you contrast this with Futures, money is not being created but moving from one pocket to another.\"
THIS IS THE STATEMENT FROM ABOVE CHAPTER. Futures is a money movement. VEry nicely explained. Thanks a lot for such a wonderful explaination. Futures is a fight between two mindsets- equivalent to playing a chess or any game with an opponent.

		[Reply](#comment-502040)

						Karthik Rangappa says:		

			[September 10, 2023 at 8:38 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-502069)		

Thanks and I\'m really glad you liked the content, Dr.Agarwal. Happy learning 🙂

		[Reply](#comment-502069)

						Elephant says:		

			[July 31, 2023 at 1:34 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-493987)		

Hello,

As I am new, I may have understood something wrong. Kindly clarify a doubt for me. Here, you assumed the futures price is 2362. But I thought that was the spot price and the future price is ~2374. Am I missing something?

		[Reply](#comment-493987)

						Karthik Rangappa says:		

			[August 1, 2023 at 10:48 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-494243)		

Spot and future prices are different right?

		[Reply](#comment-494243)

						Deepak Goyal says:		

			[July 29, 2023 at 8:57 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-493591)		

SECTION 4.4

Stock has to fall by x %age for one to lose all the margin amount; this can be calculated as –

1 / Leverage

So it works out, margin %age one has to deposit for a contract is the same %age a stock has to fall for one to lose all the margin amount. 

Nice Karthik, thanks bro for detailed chapters

		[Reply](#comment-493591)

						Karthik Rangappa says:		

			[July 30, 2023 at 1:09 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-493675)		

Happy learning, Deepak!

		[Reply](#comment-493675)

						SATYAPRAKASH says:		

			[July 4, 2023 at 12:25 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-471536)		

Can i sell a future contract on the same day if i have bought it on that day on overnight basis ?

		[Reply](#comment-471536)

						Karthik Rangappa says:		

			[July 4, 2023 at 10:28 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-471636)		

Yes, you can.

		[Reply](#comment-471636)

						Shreyas p says:		

			[July 3, 2023 at 10:27 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-471514)		

Can we square off oru position easily while trading in futures?

		[Reply](#comment-471514)

						Karthik Rangappa says:		

			[July 4, 2023 at 10:15 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-471628)		

Yes, you can as long as there is liquidity in market.

		[Reply](#comment-471628)

						Anto Tennichan says:		

			[April 14, 2023 at 1:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-457436)		

cant find a better explanation about leverage than this.

		[Reply](#comment-457436)

						Karthik Rangappa says:		

			[April 15, 2023 at 7:00 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-457628)		

Happy learning, Anto!

		[Reply](#comment-457628)

						Kumar says:		

			[March 8, 2023 at 1:09 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-452143)		

Wow. That\'s an amazing insight. Thanks for the response Karthik.

So I am safe to play around with the trade as long as the price of derivative doesn\'t fall beyond 10% incase of 10X margin right ? But it will eventually settle on expiry date at whatever is the spot price. 

Let me know if my thinking is correct below:
In the case of perpetuals(in crypto), there is no expiry. So does it mean for relatively stable bluechip assets where price fluctuations are not drastic, can I hold and trade as much as time I can ?

		[Reply](#comment-452143)

						Karthik Rangappa says:		

			[March 9, 2023 at 9:59 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-452181)		

Leverages like 10x can wipe out the accounts quickly if the risk is not managed well 🙂

Also, it depends on how you define drastic. Technically, you can keep rolling over and hold the futures as well tp perpetuity.

		[Reply](#comment-452181)

						Kumar says:		

			[March 1, 2023 at 1:37 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-451590)		

Hey Anand - Great tutorials here. I have a noob query here.

Irrespective of the underlying stock price , will the price fluctuation always remains in tune with the amount of leverage ? 

For example, \"if I take a leverage of say 10X on any given futures, will it ALWAYS take 10% fall in the price of futures to get my margin money to zero\" ?

		[Reply](#comment-451590)

						Karthik Rangappa says:		

			[March 2, 2023 at 10:14 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-451625)		

Yup, thats right.

		[Reply](#comment-451625)

						Yadagiri says:		

			[February 9, 2023 at 1:36 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-448715)		

Very good simple explanation

		[Reply](#comment-448715)

						Karthik Rangappa says:		

			[February 10, 2023 at 7:24 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-448886)		

Happy learning 🙂

		[Reply](#comment-448886)

						A K PRASAD says:		

			[November 27, 2022 at 5:33 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-437120)		

lucid  explanation.  easy  to understand. thanks.

		[Reply](#comment-437120)

						Karthik Rangappa says:		

			[November 28, 2022 at 2:46 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-437207)		

Happy learning 🙂

		[Reply](#comment-437207)

						Abhishek says:		

			[September 28, 2022 at 10:06 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-424177)		

		Its a great great explanation Karthik.
I have one question here, If I buy 1 lot of TCS and paying 41335(margin amount) and contract value is 295250 and holding this position till expiry or carry forward for next month so any interest have to pay on contract amount or any of the amount.

		[Reply](#comment-424177)

						Karthik Rangappa says:		

			[September 29, 2022 at 11:45 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-424303)		

There is no interest Abhishek. But remember, the contract will expire on the last Thursday of the month and you cant hold beyond that.

		[Reply](#comment-424303)

						Shrihari khemka says:		

			[August 12, 2022 at 11:25 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-412977)		

Hi, Can you please explain how 1/leverage gives us the percentage drop for entire margin to be wiped out? Rest all the part is crisp and clear. thanks!

		[Reply](#comment-412977)

						Karthik Rangappa says:		

			[August 13, 2022 at 8:02 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-413198)		

When you do 1/leverage, you get the percentage representing the min movement required to double your money or lose the entire capital. 1/leverage is just the math.

		[Reply](#comment-413198)

						Ujjwal says:		

			[July 12, 2022 at 5:52 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-400239)		

So when should one consider buying stocks instead of futures?

		[Reply](#comment-400239)

						Karthik Rangappa says:		

			[July 13, 2022 at 9:17 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-400520)		

When you don\'t want to use leverage.

		[Reply](#comment-400520)

						Anil POLINENI says:		

			[July 10, 2022 at 4:38 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-399119)		

Futures are daily settled in India? Futures on stocks are cash settled?

		[Reply](#comment-399119)

						Karthik Rangappa says:		

			[July 11, 2022 at 10:12 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-399500)		

Yes, that is called mark to market, Anil. Stock futures are physically settled upon expiry.

		[Reply](#comment-399500)

						Pradeep P says:		

			[June 24, 2022 at 11:22 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-390055)		

Hi Karthik, quick question, it\'s been giving me a hard time understanding - 

Let\'s say we do intraday in futures of a stock and we are long. Is the price that appear on the chart and the tradable price the same? I have this question because futures is a derived price and the chart shows that. But if we want to trade in that, we need to look at the market depth, so will the market depth also have prices that is close to what is been shown on the chart. Will there be a situation where I am long and the futures price (as per the chart) has gone up but the market depth prices (bid/offer) has not changed much? I hope my question is clear, might be a weird question but nobody to ask this to other than you Mr Karthik.

		[Reply](#comment-390055)

						Karthik Rangappa says:		

			[June 25, 2022 at 10:16 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-390354)		

Yes Pradeep, for example, if you are trading Infy futures, then look at Infy futures chart. The chart displays the last traded price. Bid and ask is just on the dept and wont impact the chart.

		[Reply](#comment-390354)

						Ram says:		

			[May 12, 2022 at 11:07 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-366880)		

Hello, Karthick I can understand your teaching It\'s in a very simple way. By the way, my age is 22 I would like to take some risks till my age of 30. So, my question to you is How can we relate this future Market to real estate. Bot are different.

		[Reply](#comment-366880)

						Karthik Rangappa says:		

			[May 12, 2022 at 7:27 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-366900)		

Both are different, Ram. But I used the concept to explain leverage 🙂

		[Reply](#comment-366900)

						ROMESH says:		

			[May 9, 2022 at 11:26 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-366612)		

Leverage is a double-edged sword. If used in the right spirit and knowledge, leverage can create wealth; if not, it can destroy wealth. - Beautiful lines.

		[Reply](#comment-366612)

						Karthik Rangappa says:		

			[May 10, 2022 at 10:10 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-366744)		

Happy learning 🙂

		[Reply](#comment-366744)

						Riddhi Kamal Parekh says:		

			[April 14, 2022 at 7:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-353806)		

Isnt the leverage only 3.57 times in the TCS eg i.e. 295,250/82670,  as we have bought 2 lots?

		[Reply](#comment-353806)

						Karthik Rangappa says:		

			[April 15, 2022 at 11:57 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-354036)		

Its not the number of lots. Its the amount you pay for a lot versus the contract size.

		[Reply](#comment-354036)

						Arpitha says:		

			[April 13, 2022 at 12:22 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-353017)		

sir as per my understanding: leverage is optional &#8230;if we take leverage 1) in case of loss it deducts money from margin money. 2)if in case only take a trade on margin money in case of loss it gets to deduct from margin money itself&#8230;..am I right sir?

		[Reply](#comment-353017)

						Karthik Rangappa says:		

			[April 14, 2022 at 7:00 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-353484)		

No. In futures and options, leverage is not optional. It is inherent to the instrument.

		[Reply](#comment-353484)

						Arpitha says:		

			[April 13, 2022 at 11:56 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-353007)		

is it compulsory to take leverage? for futures

		[Reply](#comment-353007)

						Karthik Rangappa says:		

			[April 14, 2022 at 6:59 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-353483)		

Yes, if you don\'t wish then you can transact in Equity without any leverage.

		[Reply](#comment-353483)

						Animesh jain says:		

			[April 13, 2022 at 10:25 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-352973)		

Sir u mentioned that \" if tcs falls by 14% , then we will loose all the margin amount\". Does this mean that suppose if i bought tcs today and the expiry is suppose 25 days from now and If tcs falls by 14% say tomorrow, then will the margin amount be debited from my account or will it simply show a loss of the margin amount? I mean will the contract remain or not?

		[Reply](#comment-352973)

						Karthik Rangappa says:		

			[April 14, 2022 at 6:59 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-353481)		

Thats right. Remember, there is a mark to market for options and daily P&L gets adjusted.

		[Reply](#comment-353481)

						Akshatha T says:		

			[March 9, 2022 at 10:36 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-341727)		

Could you please explain more about the \"zero-sum game\"?

		[Reply](#comment-341727)

						Karthik Rangappa says:		

			[March 10, 2022 at 10:36 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-341841)		

In derivatives, money just transfers hands from one party to another. No new wealth is created as such. Hence its called a zero-sum game.

		[Reply](#comment-341841)

						yash jadhav says:		

			[February 8, 2022 at 1:06 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-333262)		

ANOTHER QUERY WHAT IF LOSSES EXCEEDS OUR MARGIN DEPOSITED AMOUNT ?

		[Reply](#comment-333262)

						Karthik Rangappa says:		

			[February 8, 2022 at 8:36 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-333369)		

Unlikely, but if yes, delayed payment charges will be applicable in that case.

		[Reply](#comment-333369)

						yash jadhav says:		

			[February 8, 2022 at 1:03 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-333259)		

sir how can there be same buy price in spot market and future market in case of tcs example ?

		[Reply](#comment-333259)

						Karthik Rangappa says:		

			[February 8, 2022 at 8:33 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-333368)		

The futures price is pretty close to the spot price, Yash. May not be the exact same price.

		[Reply](#comment-333368)

						Animesh says:		

			[February 6, 2022 at 6:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-332687)		

Hiii there , I want to trade in future in indices, so I have a few querries regarding   , the risk      I want to ask the risk of the trade is  equal to the moment of the stock ( which is against your direction) * lot size  &#8230; Or is there any this else which is needed to be noticed  , thaanks!

		[Reply](#comment-332687)

						Karthik Rangappa says:		

			[February 7, 2022 at 11:35 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-332915)		

There are several risks Animesh - price moving against your trade, volatility increasing, liquidity risk.

		[Reply](#comment-332915)

						Piyush says:		

			[January 19, 2022 at 11:54 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-327683)		

		Hi Karthik,
I started late in stock market because of lack of exposure initially and was in search of good structured training course to understand basic terminology, jargons. I found training sessions designed by your team simple, structured that helped me immensely. I hope that thousands of retail investors will benefit from such training courses.
Thanks
Piyush

		[Reply](#comment-327683)

						Karthik Rangappa says:		

			[January 19, 2022 at 8:15 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-327773)		

		Thanks for the kind words and I\'m glad that you found the content easy to follow and understand 🙂
Happy learning!

		[Reply](#comment-327773)

						Jay says:		

			[December 24, 2021 at 3:39 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-319086)		

Hi Karthik. Thanks for an excellent explanation&#8230;I want to know, after entering into a futures contract, if at the time of contract expiry date I\'m in profit (or loss) then what exactly happens? In case of profit, do I need to pay the remaining contract value & get the shares in my Demat account? or do I get only the profit portion amount transferred in my account?

		[Reply](#comment-319086)

						Karthik Rangappa says:		

			[December 24, 2021 at 8:43 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-319193)		

Please do check this chapter, Jay - https://zerodha.com/varsity/chapter/quick-note-on-physical-settlement/

		[Reply](#comment-319193)

						Ankush says:		

			[December 8, 2021 at 3:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-312649)		

What is the difference between obtaining leverage through pledging of holdings and the leverage in margin trading in equity intraday? I mean if we do intraday in equity cash segment we can get leverage by pledging our holdings and also by maintaining the required margin, so what is the difference between them? And what exactly happens if my losses go beyond the required margin and my fund shows a huge negative balance in case of volatility and my broker was unable to square off the position? In this case when will my position get square off? Will it get square off after market closes? And what consequences will i have to face? And what consequences do my broker face?

		[Reply](#comment-312649)

						Karthik Rangappa says:		

			[December 8, 2021 at 10:14 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-312799)		

Ankush, they both are different forms of leverage, but the end of the day it\'s still leverage. If losses goes beyond margins, the broker will cut your position and make good for losses.

		[Reply](#comment-312799)

						U H Bhise says:		

			[December 2, 2021 at 10:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-310038)		

Excellently simplified.

		[Reply](#comment-310038)

						Karthik Rangappa says:		

			[December 3, 2021 at 12:35 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-310238)		

Happy learning 🙂

		[Reply](#comment-310238)

						Swaminathan says:		

			[November 28, 2021 at 1:52 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-308623)		

Thanks for the reply. Keep up the good work of educating and transforming people into traders.

		[Reply](#comment-308623)

						Karthik Rangappa says:		

			[November 29, 2021 at 7:30 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-309091)		

Happy learning 🙂

		[Reply](#comment-309091)

						Swaminathan says:		

			[November 27, 2021 at 2:36 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-308180)		

Earlier, while trading in F&O segment, we were given huge leverage. Some of the brokers were giving 50 times leverage or even more. But while trading in the Equity segment, we will not get this much leverage. This was the top lucrative reason for traders seeking to trade in F&O segment. But now, after SEBI\'s new margin rules, the leverage has been restricted to 5 times in Equity as well as F&O segment. That\'s why I said  F&O has lost its edge over Equities trading from a leverage perspective. Don\'t you think ? Also, with high leverage comes high reward ( and high risk too ). Now that the high leverage is cut down, what would be the top factors that would still pull traders towards trading in F&O. Your views pls.

		[Reply](#comment-308180)

						Karthik Rangappa says:		

			[November 28, 2021 at 11:25 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-308563)		

5 times leverage is still good enough for active traders. Like you mentioned, high leverage comes with a very high risk, something that\'s not worth taking for bulk majority of traders.

		[Reply](#comment-308563)

						Swaminathan says:		

			[November 26, 2021 at 7:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-307822)		

Mr.Karthik, thank you for educating the readers through these topics. So, with the new margin rules in force, Equity F&O trading has lost its edge over Equities trading (from a leverage perspective). Is that right ? Kindly clarify.

		[Reply](#comment-307822)

						Karthik Rangappa says:		

			[November 27, 2021 at 11:17 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-308114)		

Not really, with the new margin policy, the leverage has been reduced to just 5x, but leverage still exists.

		[Reply](#comment-308114)

						Swapnil says:		

			[November 20, 2021 at 6:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-305198)		

Really made easy to understand with the help of examples. Kudos to you sir!! Thank you.

		[Reply](#comment-305198)

						Karthik Rangappa says:		

			[November 21, 2021 at 11:08 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-305542)		

Happy learning, Swapnil.

		[Reply](#comment-305542)

						suchi says:		

			[November 11, 2021 at 4:10 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-301257)		

I didn\'t understand the formula 1/leverage. How did we arrive at this formula and conclusion that if 1/leverage is 14% then it means if TCS stocks fall by 14% we will lose our margin amount. How ?

		[Reply](#comment-301257)

						Karthik Rangappa says:		

			[November 11, 2021 at 7:46 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-301348)		

Reduce the stock price by 14%, and multiply the new stock price by lot size, which gives you the loss. Which will be equal to the margin you\'ve put for the trade.

		[Reply](#comment-301348)

						bharath says:		

			[October 11, 2021 at 5:41 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-289446)		

Hello Karthik

Is there a way I could do dummy trades(paper trades) to learn futures and options.
Thanks also for varsity i lacked knowledge in many areas this has helped me hugely please keep up the good work!
Regards
Bharath

		[Reply](#comment-289446)

						Karthik Rangappa says:		

			[October 11, 2021 at 9:45 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-289503)		

Dummy trades or paper trades may not help. Instead, I\'d suggest you try the USD INR futures, to try out trades and experience it, margins are lower and so is the risk.

		[Reply](#comment-289503)

						Vikshita M says:		

			[September 26, 2021 at 9:41 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-283570)		

Hello Sir. I\'m a CA final student. Your varsity teachings have helped me a lot for my CA final SFM preparation. Thanks a lot!

		[Reply](#comment-283570)

						Aman Mishra says:		

			[September 23, 2021 at 8:29 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-282809)		

Hi Karthik. Can you please tell me that what will happen if the price goes really down and i lose all my margin and then the price goes up. Wil I be in the trade???

BTW great content&#8230;

		[Reply](#comment-282809)

						Karthik Rangappa says:		

			[September 24, 2021 at 12:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-282872)		

Aman, the broker would have closed your position in case of short margin. Unfortunately, there is nothing much that can be done in such situations.

		[Reply](#comment-282872)

						Ishita says:		

			[September 22, 2021 at 4:31 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-282381)		

Hi Karthik! Post 1 Sep 2021, since new SEBI rules are applicable, do futures still have the benefit of margin or are margins completely eliminated now? If so, then returns would be the same whether we buy equity or futures right? Only benefit in case of buying futures is that you can sell it the next day itself. Please correct me if I\'m wrong. Thanks!

		[Reply](#comment-282381)

						Karthik Rangappa says:		

			[September 22, 2021 at 9:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-282470)		

Margins still exist, it is just that the leverage on these instruments is restricted to 5 times across all brokers.

		[Reply](#comment-282470)

						Hrishikesh says:		

			[September 1, 2021 at 7:31 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-273788)		

Sir can you explain how margin percentage calculated. In the case of TCS it was 14%. How can we calculate for others.

		[Reply](#comment-273788)

						Karthik Rangappa says:		

			[September 2, 2021 at 9:14 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-274042)		

That\'s based on the SPAN methodology, which is known to the exchanges.

		[Reply](#comment-274042)

						Murali says:		

			[July 27, 2021 at 12:12 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-261666)		

		Hello Sir,
I have a doubt about the following section. As far i see, i need not wait for T+2 days to sell a stock after buying ..right? Buying on T+2 days is applicable for only T2T category stocks..isn\'t it?

Option 1 – Buy TCS Stock in the spot market

Buying TCS in the spot market requires us to check for the price at which the stock is trading and calculate the number of stocks we can afford to buy (with the capital at our disposal). After buying the stock in the spot market, we have to wait for at least two working days (T+2) to get credited to our DEMAT account. Once the stocks reside in the DEMAT account, we just have to wait for the right opportunity to sell them.

		[Reply](#comment-261666)

						Karthik Rangappa says:		

			[July 27, 2021 at 7:57 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-261756)		

Thats right Murali. But since TCS does not really belong to the T2T category, you can buy and sell at share even before the T+2 settlement. This is called the Buy today, sell tomorrow transaction.

		[Reply](#comment-261756)

						Sara says:		

			[July 24, 2021 at 3:35 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-260853)		

Thankyou for this wonderful initiative. I came across this resource totally by chance yet this has the best explanation in stock market! I m reading this in 2021 and I guess nothing has changed

		[Reply](#comment-260853)

						Karthik Rangappa says:		

			[July 25, 2021 at 9:36 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-261051)		

These are core concepts, Sara. This will remain the same no matter when you read 🙂

		[Reply](#comment-261051)

						Abhishek says:		

			[July 7, 2021 at 6:31 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-256716)		

		Hello sir,
as you explained that (What about the balance money? i.e Rs.253,915/- ( Rs.295,250/ minus Rs.41,335/-)
Well, that money is never really paid out.)
what if the trade is moving in our favor and we want to benefit from it by exercising the full contract value(as the profit that we earned is for only fraction of percentage of total contract value)
how will it be settled in the trading account if we want to do that?

		[Reply](#comment-256716)

						Karthik Rangappa says:		

			[July 7, 2021 at 9:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-256759)		

Futures has market to market settlement, Abhishek. I\'ve explained that later in the module.

		[Reply](#comment-256759)

						Lionel Ronald says:		

			[July 6, 2021 at 1:33 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-256323)		

What if the losses are so great that the margin amount is not enough? Is the margin amount the maximum loss you can have in a futures trade ?

		[Reply](#comment-256323)

						Karthik Rangappa says:		

			[July 6, 2021 at 9:28 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-256346)		

Thats possible too. In such cases the the broker will have to recover from you by invoicing you.

		[Reply](#comment-256346)

						chandan says:		

			[July 2, 2021 at 1:19 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-255598)		

With the Sebi new margin rule, we will not be able to use leverage. ? correct me if I am wrong. &

 and also how will it effect the market. ?

		[Reply](#comment-255598)

						Karthik Rangappa says:		

			[July 2, 2021 at 9:47 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-255712)		

Leverage is there but restricted to 5 times, Chandan.

		[Reply](#comment-255712)

						B SINGH says:		

			[June 12, 2021 at 5:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-247709)		

		I dont understand/agree that ideally delivery based stock buying is wealth generation (in sense of stock market procedure). Assuming neither new investors are coming up nor existing investors are bringing more money from salary/bank deposits/clients, equity investment is too just zero sum game like FnO in stock market operation sense. (Of course buying low and selling high will make investor feel appreciation of wealth which is in fact just transfer of collective pooled money from.others to him).
Investment just feels as wealth creations because new money is continuously poured in market, otherwise it\'s also a zero sum game. After IPO, it just works on demand and supply mechanism.
Please someone clarify.

		[Reply](#comment-247709)

						Karthik Rangappa says:		

			[June 13, 2021 at 9:54 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-247976)		

Not really. How would you factor in business growth and improvement in margins?

		[Reply](#comment-247976)

						Deepak says:		

			[June 4, 2021 at 11:44 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244515)		

Can the following scenario pan out: 

Bid price of scrip A is trending at Rs. 80 and below. Mr. X with very deep pockets shorts A by selling 2 million shares (presume 2% of outstanding) at limit price of Rs. 70, just for the fun of it. To enjoy the ensuing chaos. 

1. If between 80 to 70, there are 4 million orders, and till 75 there are two million orders, then after execution of his shorting order, where will LTV be set at? 

2. Two million buy orders will be executed by priority on best price basis, i.e. even if someone bid 76, will he get price of 70? 

3. There must be other sellers besides him who may have offered/ asked their prices, now, will the software match prices and execute those orders or will it go with best price criteria?

		[Reply](#comment-244515)

						Karthik Rangappa says:		

			[June 5, 2021 at 9:24 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244657)		

No Deepak, such vast price differences wont occur since there are things like execution range etc in place.

		[Reply](#comment-244657)

						Deepak Kumar Singh says:		

			[June 4, 2021 at 11:06 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244503)		

Sir

On an unrelated note, where can I find the list of all the buyers who bought a particular stock on a particular day? With a view to gauge the involvement of big players. 

Today, Bank of Maharashtra shares rose 13%. And it rose 10-11% within 7 minutes at one time. This, to me, seems indication of big player participation. 

Secondly, I could not find any rationale, logic or cause for such sudden spike. I know trends, the essence of short term movement, may not have any fundamental logic and may be, and more often than not are, driven by sentiments and trader psychology. Still such sudden movements can\'t be predicted any mathematical formulation. It was something out of the blue. I just couldn\'t find what it was. What was the cause? Could you venture a reasoned guess what it was? 

As an aside, I really do admire your unflinchingly sincerity. You must be in a job that you love. Many haven\'t been that fortunate. 

One more question below pls.

		[Reply](#comment-244503)

						Karthik Rangappa says:		

			[June 5, 2021 at 9:23 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244656)		

That list is not available, Deepak. The reason for the price move could be for any reason. Speculation is the biggest reason 🙂

Yup, I love doing this and I\'m glad I get to do it 🙂

		[Reply](#comment-244656)

						Koushik says:		

			[June 4, 2021 at 3:25 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244342)		

you a kannadiga bro?

		[Reply](#comment-244342)

						Karthik Rangappa says:		

			[June 5, 2021 at 8:43 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244636)		

Howdu bro. Pakka Kannada boy.

		[Reply](#comment-244636)

						karan says:		

			[June 4, 2021 at 5:55 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244193)		

Hi sir 

Let\'s suppose the future price of bank nifty is 35649 and market lot is 25 which makes the contract value as
35649*25= 891225
Now basis on the margin calculator the total margin ( spam+exposure) = 351129
Now to calculate the leverage i.e contract value/ margin
891225/351129= 2.538

1/2.538*100= 39.4%

Is this means that i\'ll not be loosing a money until and unless bank nifty falls till 39% ?

		[Reply](#comment-244193)

						Karthik Rangappa says:		

			[June 4, 2021 at 10:20 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244237)		

No no, that\'s the leverage. Please re-read this topic again.

		[Reply](#comment-244237)

						Deepak says:		

			[June 4, 2021 at 3:42 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244189)		

2nd question :

 \"and the seller would be making a loss of Rs.238/- per share, provided that the seller has shorted the share at Rs.2362/-\"

Why would the seller of future will short short the share? Two txn in same direction? 

Besides, if shorting is allowed only intra day, how will he be able to practically do it? 

Am I making any sense here?

		[Reply](#comment-244189)

						Karthik Rangappa says:		

			[June 4, 2021 at 10:19 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244235)		

Its not, Deepak. The context is to explain that the buyer and seller have equal P&L but opposite..as in buyer makes a profit of 10, the seller makes a loss of -10.

		[Reply](#comment-244235)

						Deepak says:		

			[June 4, 2021 at 2:04 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244170)		

		Sir,
Let\'s say, for argument\'s sake, TCS share were to fall by 42% at expiry, however unlikely it may be.  Broker will demand triple the margin money? Or is there a mechanism to avoid such scenarios? What if I don\'t have money to honor the transaction? What recourses are there?

		[Reply](#comment-244170)

						Karthik Rangappa says:		

			[June 4, 2021 at 10:13 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-244230)		

Your position will be squared off if you don\'t have the necessary margins, Deepak.

		[Reply](#comment-244230)

						Nigel says:		

			[June 3, 2021 at 10:52 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-243939)		

		Hi&#8230;
        If I\'m paying only 14% margin,  how can take the profit amount Rs.39250 fully ?? Out of the total profit only 14% would be my share.

		[Reply](#comment-243939)

						Karthik Rangappa says:		

			[June 3, 2021 at 12:39 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-243957)		

No, your profit or loss is entitled completely to you.

		[Reply](#comment-243957)

						Tanmay says:		

			[June 2, 2021 at 1:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-243606)		

		Hello Sir,
Lets say I have a current bullish view on Infy.

I am not sure when exactly my target will get achieved by I think sometime in a few days-few weeks,

So should I buy a Future and protect it with an ATM put option or should I buy an ATM call option.
Both has the nearly identical pay-out graph, buying an ATM is requires little more premium and does not require margin compared to the Synthetic Call position? Time decay would affect both option contracts appropriately but the protection put for future reduces hence it can cause problems for me. The pro of the synthetic call is that I don\'t have to pick a strike price so I don\'t have to worry about when my target gets achieved.

For an index, I have an choice to pick weekly or monthly option contracts.

Which strike price should one choose for protecting the future?

		[Reply](#comment-243606)

						Karthik Rangappa says:		

			[June 2, 2021 at 7:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-243746)		

Assuming there is a lot of time to expiry, and that you are outrightly bullish, then you can maybe buy a slightly OTM Call option. You can buy futures as well, but that the only issue is that you will have to deal with the daily mark to market. You can protect the Fut with a slightly OTM PUT.

		[Reply](#comment-243746)

						Sundaramoorthy says:		

			[May 31, 2021 at 10:35 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-243256)		

		Hi,
Will it be right if I say that Futures Trading is nothing but an Intraday share Trading where the quantity is in lot and the day is an extended period till the expirty date?

		[Reply](#comment-243256)

						Karthik Rangappa says:		

			[June 1, 2021 at 9:44 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-243395)		

Well yes, except for intraday bit 🙂

		[Reply](#comment-243395)

						Viraj Jadhav says:		

			[May 14, 2021 at 7:34 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-235088)		

hello sir if we use leverage then we have to pay the levrage after profit????

		[Reply](#comment-235088)

						Karthik Rangappa says:		

			[May 14, 2021 at 10:11 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-235123)		

Pay the leverage means?

		[Reply](#comment-235123)

						Viraj Jadhav says:		

			[May 12, 2021 at 5:52 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-234427)		

SIR, IF I USED THE LEVERAGE IN EQUITY STOCK  AND I HAVE DID A PROFIT SO  I HAVE TO PAY ALL THE LEVERAGE&#8230;&#8230;..AND WHAT IF I DID LOSS.

		[Reply](#comment-234427)

						Karthik Rangappa says:		

			[May 12, 2021 at 8:47 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-234495)		

Sorry, dint really get that. Can you please share more context? Thanks.

		[Reply](#comment-234495)

						venus says:		

			[May 12, 2021 at 11:44 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-234295)		

		First of all thanks Karthik for your lucid explanation of all concepts.
My query is - if an underlying has low volatility, the margin requirement will be lesser. Since margin required is a smaller percentage of contract value, leverage will be higher for taking a trade in a low volatility stock. But since leverage is high it will be a riskier trade.
Now isn\'t it counterintuitive that taking a futures trade in an underlying with LOW VOLATILITY have HIGHER RISK ?

		[Reply](#comment-234295)

						Karthik Rangappa says:		

			[May 12, 2021 at 12:51 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-234320)		

If it\'s low volatility, then the chances of it moving drastically against your position is low. So that\'s an important thing to note 🙂

		[Reply](#comment-234320)

						Nilesh says:		

			[May 9, 2021 at 7:48 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-233573)		

		Sir,
This is regarding term ‘Short Covering’ when underlying is index (Nifty or BankNifty).
We know that value of Nifty is calculated from 50 Top MCap companies’ Spot Price. Then by trading Nifty Futures or Options, how can it impact value of Nifty to go up?
Hope my question is clear to you.

Thanks in advance

		[Reply](#comment-233573)

						Karthik Rangappa says:		

			[May 9, 2021 at 8:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-233603)		

Its tough, but if the futures go up, then for short period it may influence stock buying which in turn pushes the index up, this is not sustainable though.

		[Reply](#comment-233603)

						ravage says:		

			[April 14, 2021 at 11:35 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-224992)		

Don\'t mislead people by showing them only the rosy side of the story .At least tell them in detail how much they will lose if the share price falls.  \"Never use leverage on volatile stocks guys you will lose all your money they will only show the positive side if the story\". I have been in stock market for less than 2 months and still know the disadvantages of leverage and you are teaching people about leverage and still cant mention any of its downside.

		[Reply](#comment-224992)

						Karthik Rangappa says:		

			[April 15, 2021 at 11:51 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-225157)		

Please take the trouble of reading the entire module.

		[Reply](#comment-225157)

						Sai Avinash says:		

			[April 12, 2021 at 4:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-224233)		

What if the loss exceeds the margin? how will it be paid out then

		[Reply](#comment-224233)

						Karthik Rangappa says:		

			[April 12, 2021 at 11:07 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-224461)		

The position will be cut by the broker in case of insufficient margins.

		[Reply](#comment-224461)

						Anand says:		

			[March 28, 2021 at 7:51 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-218366)		

Can future options be taken as normal trade and get the share in demat account if decided for the same and paid out the full price at or before expiry

		[Reply](#comment-218366)

						Karthik Rangappa says:		

			[March 29, 2021 at 9:11 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-218579)		

Yes, happens on a physical delivery basis.

		[Reply](#comment-218579)

						Abhijeet Sharma says:		

			[March 22, 2021 at 5:02 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-216041)		

		Great&#8230;
Thanks Karthik

		[Reply](#comment-216041)

						Karthik Rangappa says:		

			[March 23, 2021 at 10:51 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-216295)		

Good luck!

		[Reply](#comment-216295)

						Abhijeet Sharma says:		

			[March 20, 2021 at 5:49 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-215614)		

Hi Karthik,

How to find margin of any specific future. As margin is base for leverage calculation and leverage is base for which future to trade in&#8230;
TIA

Abhijeet

		[Reply](#comment-215614)

						Karthik Rangappa says:		

			[March 21, 2021 at 7:28 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-215647)		

You can check the margins here - https://zerodha.com/margin-calculator/SPAN/

		[Reply](#comment-215647)

						Naved Nawroz says:		

			[March 4, 2021 at 11:39 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-210528)		

		Sir,
Does brokerage includes the interest charged on leverage provided or any other specific payment would deduct during fix time intervals?
Specially for MIS orders.

		[Reply](#comment-210528)

						Karthik Rangappa says:		

			[March 5, 2021 at 10:02 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-210648)		

No, the brokerage does not include that. Btw, there is no additional cost for providing leverage.

		[Reply](#comment-210648)

						Karthik Rangappa says:		

			[March 6, 2021 at 11:11 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-210944)		

No, if any other charges, it will be levied separately and shown to you in your ledger.

		[Reply](#comment-210944)

						Suraj says:		

			[February 24, 2021 at 6:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-208256)		

you took spot price and future price here in TCS\'s example same , ideally this may not be case

		[Reply](#comment-208256)

						Karthik Rangappa says:		

			[February 24, 2021 at 8:54 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-208300)		

Why not?

		[Reply](#comment-208300)

						Tufel says:		

			[February 13, 2021 at 5:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-205293)		

		As all explanations was really great .My question is Does Zerodha Charge For Leverage that we take for intraday&#8230;. If we r in profit we book the profit n if in loss we book the loss right?&#8230;.
All the leverage traded value has to be return which is huge amount after taking Leverage&#8230;. 

And 1 more question is Can we do buy or sell same stock in intraday daily&#8230;. Is it allowed?

		[Reply](#comment-205293)

						Karthik Rangappa says:		

			[February 14, 2021 at 10:27 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-205512)		

No, there is no separate charge for leverage. Yes, you can daily trade stocks, but ensure you know what you are doing, else the risk of capital is quite high.

		[Reply](#comment-205512)

						Varun says:		

			[February 3, 2021 at 9:18 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-201617)		

Hi Karthik,

First off, Hats Off to Zerodha on its phenomenal journey since its inception. I came across Varsity about 2-3 years back and it is has been a wonderful learning experience so far. 

A fundamental query on margin trades, I may have missed it incase discussed in the comments.

To engage in a futures trade, one has to pay only the margin amount. Why is the balance amount of the contract value never paid out? 

Thanks in advance,

Varun

		[Reply](#comment-201617)

						Karthik Rangappa says:		

			[February 3, 2021 at 10:53 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-201639)		

Because Futures is a leveraged product. However, if you do hold the futures closer (stocks) to expiry, then you will be required to deposit full contract value as margins.

		[Reply](#comment-201639)

						Arvind says:		

			[January 31, 2021 at 2:38 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-200856)		

How are the gains in futures treated for income tax purposes.

		[Reply](#comment-200856)

						Karthik Rangappa says:		

			[February 1, 2021 at 8:29 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-201026)		

Please do check the module on Markets and Taxation.

		[Reply](#comment-201026)

						Brajesh says:		

			[January 26, 2021 at 9:58 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-199649)		

Do one has to wait to sell future contact as done in share T+2 days

		[Reply](#comment-199649)

						Karthik Rangappa says:		

			[January 27, 2021 at 10:21 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-199765)		

Sorry, I did not see to understand your query. You can sell a Futures contract instantly, no need to wait.

		[Reply](#comment-199765)

						vivek says:		

			[January 22, 2021 at 5:35 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-198616)		

		Hi
A bit late to the party here. In the calculation for leverage ratio above, which margin value is being used? viz NRML/MIS/CO?&#8230;all are different and would throw up significantly different results, can you plz clarify?
Also, you\'ve mentioned an overleveraged position as being > 10-12. Is this with NRML margin option or MIS/CO?
Thanks!

		[Reply](#comment-198616)

						Karthik Rangappa says:		

			[January 23, 2021 at 12:23 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-198803)		

Depends on which product you are using. Use NRML margin if you wish to carry forward the trade, MIS if it is an intraday trade. Btw, all margins will be normalized with the new peak margin, check this - https://zerodha.com/z-connect/zerodha/bulletin-latest-at-zerodha/peak-margin-intraday-leverages-2nd-order-effects-dec-1st-2020

		[Reply](#comment-198803)

						Tufel says:		

			[January 15, 2021 at 10:48 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-197161)		

		Suppose I have 1 lakh in demat account.If I buy 1000 shares of infy in MIS EQ&#8230;. Actual Buy value will be more right?&#8230;. So in this case company gives us Leverage&#8230;.
 Suppose if we r in loss, only the loss money wl be deducted right?&#8230;.
And Suppose if we r in Profit? We get back amt invested n the profits after 2 days?&#8230;.here only brokerage wl be deducted with tax n wat charges we wl get then?&#8230;.
or have to give actual money of 1000 shares ka more than 10lakh has to be paid&#8230;. no right?&#8230;. if we r in profit? What company actually gets ?

		[Reply](#comment-197161)

						Karthik Rangappa says:		

			[January 16, 2021 at 11:56 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-197278)		

That\'s right, Tufel. Brokerage is applicable on this though.

		[Reply](#comment-197278)

						Prince Gandhi says:		

			[December 25, 2020 at 12:00 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-191597)		

Which segments do you prefer for yourself and recommend others to trade in? Cash, Futures or Options? (Assuming the investor has in depth knowledge of all segments)

		[Reply](#comment-191597)

						Karthik Rangappa says:		

			[December 26, 2020 at 8:27 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-191740)		

I\'d prefer you swing trade with cash.

		[Reply](#comment-191740)

						Vikas says:		

			[December 25, 2020 at 10:36 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-191577)		

Sir.I want intraday trading by leverage amount about 10lakh.then i get 1000/profit.then what charges taken by broker house

		[Reply](#comment-191577)

						Karthik Rangappa says:		

			[December 26, 2020 at 8:26 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-191739)		

Please do check this Vikas - https://zerodha.com/charges

		[Reply](#comment-191739)

						Jayesh vikas mahajan says:		

			[December 24, 2020 at 3:30 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-191434)		

What are charges taken by zerodha on leverage amount for intraday

		[Reply](#comment-191434)

						Karthik Rangappa says:		

			[December 24, 2020 at 8:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-191485)		

Please check this - https://zerodha.com/charge

		[Reply](#comment-191485)

						Jay Harsora says:		

			[December 20, 2020 at 4:49 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-190571)		

Beautiful representation and easy to understand

		[Reply](#comment-190571)

						Karthik Rangappa says:		

			[December 20, 2020 at 9:25 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-190619)		

Happy learning!

		[Reply](#comment-190619)

						Prince Gandhi says:		

			[December 3, 2020 at 2:23 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-186225)		

		Question 1: Can we short sell Futures like we used to short sell stocks?
Question 2: You mentioned that we can sell stocks only after having them on our deemat account, buy I saw that we can sell stocks on T+1 day before taking the delivery. Have the rules changed? And can you explain the current changes in rules of margin given by SEBI?

I would like to here your debate with your friend regarding which is better, equity or real estate. 😄

By the way, you out performed on this Karthik sir, thank you!

		[Reply](#comment-186225)

						Karthik Rangappa says:		

			[December 3, 2020 at 7:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-186240)		

		1) Yes, you can
2) No, this was always the case. These trades are called \'Buy today, sell t\'row\'or the BTST trades 

Equity for me 🙂

		[Reply](#comment-186240)

						Chandu says:		

			[December 1, 2020 at 4:32 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-185728)		

		Hi sir..
personally don’t like to over leverage, I stick to trades where the leverage is about 1 :10 or about 1:12, not beyond this.
Sir could you please explain this with example, how you would leverage

		[Reply](#comment-185728)

						Karthik Rangappa says:		

			[December 1, 2020 at 8:33 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-185778)		

Anyway, the leverage bit is changing in India, so this won\'t matter going forward, check this - https://zerodha.com/z-connect/zerodha/bulletin-latest-at-zerodha/peak-margin-intraday-leverages-2nd-order-effects-dec-1st-2020

		[Reply](#comment-185778)

						Vishaal Db says:		

			[November 25, 2020 at 9:30 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-184321)		

I know this is nit picky but this paragraph needs the word \'to\' added to it after the word \'Thanks\'. I\'m Just making an already amazing article even more amazing 🙂

Futures offer something more than a plain vanilla spot market transaction. Thanks \'to\' the existence of ‘Margins’ you require a much lesser amount to enter into a relatively large transaction. If you’re directional view is right, your profits can be really large.

		[Reply](#comment-184321)

						Aarti says:		

			[November 16, 2020 at 2:59 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-182648)		

Leverage = [Contract Value/Margin]. Hence for TCS trade the leverage is

= [295,250/41,335]

= 7.14, which is read as 7.14 times or simply as a ratio – 1: 7.14.

sir here the ratio should have been 7.14:1 (i.e. to say that for every 1 rs invested we can buy 7.14rs of TCS futures) according to my understanding of maths.
may be am wrong; would be great if you could relook at it and help me understand where exactly the catch is.  

thanks in advance!

		[Reply](#comment-182648)

						Karthik Rangappa says:		

			[November 16, 2020 at 9:08 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-182735)		

Ah yes, Aarti. Means to say that every 1 Rupee of your own can be leveraged 7.14 times.

		[Reply](#comment-182735)

						Aarti says:		

			[November 16, 2020 at 2:28 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-182641)		

Firstly sir, i would like to take a moment to wish you a very happy new year! Hope you have a successful year ahead and keep adding many more such enriching modules to Varsity;)

Secondly, I had a doubt in the following concept:
\"Now for a moment assume the margin requirement was just Rs.7000/- instead of Rs.41,335/-. In this case, the leverage would be
= 295,250 / 7000
= 42.17 times\"

Now, my doubt is that technically the leverage is Rs 295250-7000=Rs288250 so then why are we not taking 288250/7000=41.17times leverage. Because what is really happening is this: 41.17&#215;7000+7000=295250. so then the leverage clearly becomes 41.17times the margin and not 42.17times. 

Your thoughts on this sir?
Thanks in advance!

		[Reply](#comment-182641)

						Karthik Rangappa says:		

			[November 16, 2020 at 9:03 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-182733)		

		Thanks for the kind words, Aarti. Wishing you the same!
The standard practises when talking about leverage is to use the contract value in the numerator. Also, 41 or 42 or 43 times does not really matter, as long as you get a sense of how large the leverage is 🙂

		[Reply](#comment-182733)

						Shashank Pendyala says:		

			[November 15, 2020 at 9:42 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-182574)		

		Hi Karthik & Team,
As usual explanation is top notch and to the point with perfect analogy. Some questions regarding P&L for futures.
Suppose we purchased 1 LOT of TCS considering bullish or bearish directional view, so LOT purchased today - 15 Nov and Expiry is 30 Nov.
1. I\'m not planning to square off position till expiry then will profit and loss settle on daily basis?
2. What if loss is greater than Margin amount blocked by broker?
3. My understanding is that Margin amount is one time, post that even though we incur losses should we have to keep funds in our account? What if we don\'t keep? Will it be squared off and how will broker recover the amount if some person incurred heavy losses.

There are many question heads, please answer separately 🙂

		[Reply](#comment-182574)

						Karthik Rangappa says:		

			[November 16, 2020 at 8:42 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-182729)		

Glad you liked the content, Shashank. 

1) Yes, this is called the M2M process, more on that here - https://zerodha.com/varsity/chapter/margin-m2m/
2) As the loss approaches the margin blocked the
3) Margins are dynamic, keeps varying based on the movement in the underlying. Yes, it will be squared off if the losses are higher than the margin blocked.

		[Reply](#comment-182729)

						Mohit says:		

			[November 9, 2020 at 10:25 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-180840)		

		Great to learn in such amazing and easy way sir. Thanx alot
Are u on any social media platforms?

		[Reply](#comment-180840)

						Karthik Rangappa says:		

			[November 10, 2020 at 12:39 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-180984)		

I\'m on Twitter - @karthikrangappa

		[Reply](#comment-180984)

						Karthik Nallathambi says:		

			[November 7, 2020 at 8:59 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-180239)		

You\'re one of the greatest Mr. Karthik sir. I could understand how hard your research is,  because you deliver your knowledge is very simple and easy to understand. Tell me where you are,  i need an autograph from you sir 😁

		[Reply](#comment-180239)

						Karthik Rangappa says:		

			[November 8, 2020 at 12:44 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-180404)		

Haha, thanks for the kind words 🙂 

Don\'t think I\'m autograph worthy lol 🙂

		[Reply](#comment-180404)

						Tanmay Selot says:		

			[November 4, 2020 at 8:56 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-179547)		

		Hello Kartik Sir,
All I want to say is that all the modules on the varsity app, written by you are absolute gold. The way it was been explained can be understood by anyone. Thank you for that
I have one more question. The Children\'s books which zerodha is providing will be useful for which age bracket of children?

		[Reply](#comment-179547)

						Karthik Rangappa says:		

			[November 5, 2020 at 11:07 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-179700)		

Thanks for the kind words, Tanmay. The children\'s book is good for kids above 7 years.

		[Reply](#comment-179700)

						Vinay Thallam says:		

			[October 27, 2020 at 5:52 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-177246)		

Hello Karthik, 

Great Explanation. Thank you. One question btw. I understood that the underlying is never transacted when the futures is squared off. What is the purpose of futures\' concept existence apart from facilitating traders to make/loose money ?

		[Reply](#comment-177246)

						Shriram says:		

			[October 17, 2020 at 8:37 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-174389)		

Hi Karthik, I started learning Futures. My doubt is I could see from Kite, 

Spot:  INFY 1200 shares, CO/BO Margin = ₹76,796.28
                                           MIS Margin     = ₹1,27,993.80
Futures: INFY OCT FUT * 1200, CO/BO Margin = ₹57,569.11
                                                     MIS Margin = ₹1,01,623.50 

For intraday trading, there is not much difference in Spot and Futures in-terms of leverage, right. If yes, shall I choose to do spot trading itself. Or do we have any other benefits in Futures. Thanks.

		[Reply](#comment-174389)

						Karthik Rangappa says:		

			[October 18, 2020 at 10:29 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-174554)		

There is a 30% difference right? But yeah, if its intraday, you can use Spot itself.

		[Reply](#comment-174554)

						Ayush mittal says:		

			[October 16, 2020 at 8:58 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-174105)		

If I long on a position, keeping a bullish view, and someone short a position, keeping the bearish view. But on the second day of buying my prediction is going true and the price of futures is going up, but the other party settles the trade. Then what will happen even though I don\'t want the settle.

		[Reply](#comment-174105)

						Karthik Rangappa says:		

			[October 17, 2020 at 9:56 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-174253)		

The party squaring off will sell it another buyer, and you contract will exist in the system.

		[Reply](#comment-174253)

						Arpit Raaj says:		

			[October 15, 2020 at 6:01 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-173728)		

		\"The proportionality comes from the fact that the money made by the buyer is the loss suffered by the seller (provided they have bought/short the same price), and vice versa.\"
You\'ve mentioned this thing in the bracket a multiple times; just need some more clarity on this as I\'m a beginner. I mean my doubt is if I buy at a certain price from the seller, doesn\'t the seller has to sell it necessarily at the same price?

		[Reply](#comment-173728)

						Karthik Rangappa says:		

			[October 15, 2020 at 9:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-173797)		

A trade occurs only when the buyer and seller agree to a price right?

		[Reply](#comment-173797)

						Pavan says:		

			[September 23, 2020 at 2:27 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-167205)		

Sir / Madam,

I am new trading,  I doing F & O - Banking related, Example - BANKNIFTY 

Q 1:  what is CE or PE.  Option or Future,  Example - BANKNIFTY 10th SEP 23000 CE,  BANKNIFTY 10th SEP 23000 PE, 

Q 2: zerodha giving levorage or margin for options.  If yes, interest charged by zerodha to me yearly.

Q3:  If zerodha not giving levorage or margin then whether I pay first and then buy CE and PE Option.  Yes/No

Thanks in advance

		[Reply](#comment-167205)

						Karthik Rangappa says:		

			[September 23, 2020 at 10:18 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-167287)		

		1) I\'d suggest you read the module on options for this - https://zerodha.com/varsity/module/option-theory/
2) No interest charges
3) Yes, to buy you need to have the amount required for premium.

		[Reply](#comment-167287)

						Kireeti says:		

			[September 23, 2020 at 1:24 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-167194)		

		In 4.3 LEVERAGE -
1. You mentioned no leverage for spot market but in 2020 we have MIS option which facilitate leverage for intraday Trading. eg:upto 12x for DR Reddy\'s share.
2. And also we can trade with in a day without waiting for T+2days.
So, is futures an extension like MIS for intraday?
And Is it only the Leverage the difference between spot and futures trade?

		[Reply](#comment-167194)

						Karthik Rangappa says:		

			[September 23, 2020 at 10:17 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-167286)		

Can you share the context where I\'ve mentioned no leverage?

		[Reply](#comment-167286)

						vinay says:		

			[September 14, 2020 at 8:47 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-165235)		

Sir ,I wud like to know zerodha feature in this scenario as this trade I have done in fyers. Today when banknifty futures is trading at 22290 ,I sold 50 qty (CO Market order) sepetmber contract with stop loss at 22340 i.e 50 pts .When bank nifty futures is trading at 22130 ,I tried to change my stop loss to 22190 to block 100 pts as profit .But the fyers did not allow me to do so. This happende to me twice in fyers. Fyers support told max s.l I can chnage to the initial sell price i.e in my case is 22290. If I trade in zerodha (I have an account) whether this problem will be there ? What are the options to train stop loss smoothly.

		[Reply](#comment-165235)

						Karthik Rangappa says:		

			[September 15, 2020 at 10:03 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-165272)		

This should not happen with us as the SL is based on LTP, Vinay.

		[Reply](#comment-165272)

						Toby says:		

			[September 14, 2020 at 4:55 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-165203)		

The person/team created this content,hatsoff to them. Easy to understand and well explained with example\'s. Great Job

		[Reply](#comment-165203)

						Karthik Rangappa says:		

			[September 14, 2020 at 8:14 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-165225)		

Happy learning, Toby!

		[Reply](#comment-165225)

						Jogender says:		

			[September 9, 2020 at 5:58 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-163669)		

Dear Sir,

I am a very begginer in stock market, please tell me from where I can learn to get profit from it at affordable price. 

Queries:
1. Is leverage only work in futures not in Intraday
2. What is Margin and where and how can it be used.

		[Reply](#comment-163669)

						Karthik Rangappa says:		

			[September 9, 2020 at 11:34 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-163756)		

		1) Both futures and intraday
2) Margin is the initial deposit for the trade. Suggest you read through this chapter.

		[Reply](#comment-163756)

						Samar says:		

			[August 15, 2020 at 5:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-156665)		

Excellent job, I\'m loving Varsity and indebted to the simplicity in which you explained. Just a minor points that some things like BTST point mentioned in the comment has not been updated yet. And overall there a very minor grammatical errors. If you could ask for a proof read, it would be great. 

Thank you for Varsity!!!

		[Reply](#comment-156665)

						Karthik Rangappa says:		

			[August 15, 2020 at 7:26 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-156704)		

Thanks, Samar. Will take a look at this 🙂

		[Reply](#comment-156704)

						Krishnavelu says:		

			[August 13, 2020 at 10:25 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-155997)		

		By simple Math -Now, I am getting 235%, sir
I confused myself with the CAGR formula,
Thanks for the clarification,Sir

		[Reply](#comment-155997)

						Karthik Rangappa says:		

			[August 13, 2020 at 9:00 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-156131)		

Good luck!

		[Reply](#comment-156131)

						Krishnavelu says:		

			[August 12, 2020 at 9:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-155857)		

		Hello Sir,
Can you Explain me, How was the Annualaized Return % (235 %) calculated for a Absolute Return (9 days) which has a value 5.79% ?
While i tried to do it through the formula i am getting a totally different result (880%).

		[Reply](#comment-155857)

						Karthik Rangappa says:		

			[August 13, 2020 at 9:14 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-155982)		

Simple math - if for 9 days its 5.79%, how much is it for 365 days?

		[Reply](#comment-155982)

						Pardeep Rawat says:		

			[August 12, 2020 at 8:00 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-155828)		

Thanks like always Karthik!!

		[Reply](#comment-155828)

						Pardeep Rawat says:		

			[August 12, 2020 at 12:35 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-155727)		

Hi Karthik,

Hope you are safe and doing good!!

I need your opinion of the characteristics which a trader needs to have in order to become a successful trader. I guess that it doesn\'t need much fundamental knowledge since the trade is done from short-term perspective.  Just having a directional view would make all the difference.  So what are the skills I can learn to get directional insights about any underlying asset and any other thing which could help me to be a better trader? Please advise.

Not sure but I think you are more in fundamental (long-term investing) than future trading and if so, then please share the reason for this preference.  Thanks a lot!!

		[Reply](#comment-155727)

						Karthik Rangappa says:		

			[August 12, 2020 at 7:46 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-155822)		

I was trading quite a bit, both futures and options Pradeep. Now the company policy mandates us not to trade 🙂

Apart from being knowledgable, things that immensely help are attributes such as - resilience to events, patience, and discipline. In my view, these are highly underrated factors.

		[Reply](#comment-155822)

						DS says:		

			[July 25, 2020 at 9:42 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150499)		

So if I want to trade future with 2X leverage in zerodha what is the step by step process &#8230; sorry I couldn’t find the relevant article ie why posting it here .. i will be grateful if you could direct me the process

		[Reply](#comment-150499)

						Karthik Rangappa says:		

			[July 26, 2020 at 9:17 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150592)		

The leverage is kind of baked into the contract. So for example, margins to trade 1 lot of Nifty is Rs.1.5L. The contract size of Nifty futures is roughly 8.25L. In other words you get to trade something worth 8.25L for only 1.5L, which means to say there is a leverage of 5.5 times.

		[Reply](#comment-150592)

						DS says:		

			[July 25, 2020 at 2:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150360)		

		Hi
When an investor says he has 2X Leverage or 3X leverage what does that mean

		[Reply](#comment-150360)

						Karthik Rangappa says:		

			[July 25, 2020 at 8:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150459)		

You have Rs.100, your broker allows you to but for Rs.300, its 2x leverage. At Rs.400, its 3x leverage.

		[Reply](#comment-150459)

						Pradeep Kumar Dadhich says:		

			[July 25, 2020 at 1:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150345)		

How will the new leverage regulations impact F&O trading? Please elaborate with some examples

		[Reply](#comment-150345)

						Karthik Rangappa says:		

			[July 25, 2020 at 8:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150451)		

No impact on F&O. This is wrt to Equity intraday.

		[Reply](#comment-150451)

						Pradeep Kumar Dadhich says:		

			[July 25, 2020 at 1:09 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150344)		

I think all sections have been lucidly explained. Zerodha is doing a great service by bringing financial literacy to the masses.

		[Reply](#comment-150344)

						Karthik Rangappa says:		

			[July 25, 2020 at 8:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150450)		

Happy learning 🙂

		[Reply](#comment-150450)

						Samantha says:		

			[July 23, 2020 at 10:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-149979)		

		Sir how do I calculate profit nd loss taking leverage into accoun while doing papertrade?? Zeroda has recently removed the leverage calculator so it will be helpful if u tell us the math!!!
And sir does leverage multiply the profit/loss or the investment ???

		[Reply](#comment-149979)

						Karthik Rangappa says:		

			[July 24, 2020 at 9:42 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-150078)		

Leverage allows you to trade for amount far greater than you have as capital. Hence your P&L gets magnified. For example, I have 1000 with me, the stock is trading at 100, I can buy 10 shares without leverage. If I get leverages, I can buy for say for 1500, hence 15 shares. 

P&L math is simple - the difference between buying and sell price, multiply with quantity.

		[Reply](#comment-150078)

						TR says:		

			[July 23, 2020 at 2:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-149837)		

Ticket no 20200716224044 

I have now got the response that 

Buy average for F&O positions is calculated on a pure FIFO (First In First Out) basis. For example, let’s consider the following trades:

Date	Symbol	Trade Type	Quantity	Rate
06/08/2018	NIFTY18AUGFUT
Buy	75	11000
07/08/2018	NIFTY18AUGFUT
Buy	75	11100
07/08/2018
NIFTY18AUGFUT
Sell	75	11050
In the above case, the buy trade executed on 07/08/2018 will be the open quantity at the end of the day hence, the average price of the open quantity on 08/08/2018 will be Rs. 11100. Irrespective of the product type used (NRML/MIS) for the trades on 07/08/2018, this logic does not change.

If this is the case then, what is the difference between MIS and NRML option, If we choose NRML we can carry the position overnight

However during the day if we want to take advantage of the price fluctuations for the same futures and use MIS, it adversely affects our overnight position

I have learnt it that horrible way and loosing money

Can you please advise or write a nice example on varsity highlighting this calculations and FAQs/do\'s and donts for futures MIS and NRML orders

		[Reply](#comment-149837)

						TR says:		

			[July 17, 2020 at 12:07 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-147887)		

		I have a real example from yesterday.
If Zerodha can call me, i can show the discrepancy
It would be great if you can arrange for a call back as the support call center disconnects after being on wait for 15 minutes and for the ticket i dont see a response yet

		[Reply](#comment-147887)

						Karthik Rangappa says:		

			[July 17, 2020 at 7:03 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-147992)		

If you have raised a ticket, please do share the ticket number. Thanks.

		[Reply](#comment-147992)

						TR says:		

			[July 17, 2020 at 9:41 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-147850)		

		Cannot get through support call
It goes on wait forever

no luck with the support ticket as well

I think there is a genuine problem with use-case i mentioned

It has happened to me again yesterday

I would like to demo this issue with Zerodha and get it sorted. 

Might help others as well

		[Reply](#comment-147850)

						Karthik Rangappa says:		

			[July 17, 2020 at 11:26 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-147878)		

Getting this checked.

		[Reply](#comment-147878)

						TR says:		

			[July 15, 2020 at 12:14 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-147277)		

		I dont think this works, i have faced an issue/discrepancy in the past, i can provide the details via email
Can we discuss this further ? Infact i lost 40k due to this
I have provided my email in the comment, please feel free to ping me

		[Reply](#comment-147277)

						Karthik Rangappa says:		

			[July 15, 2020 at 6:50 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-147369)		

Request you to please call our support for this.

		[Reply](#comment-147369)

						TR says:		

			[July 13, 2020 at 12:32 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-146630)		

I have an short sell open NRML position in Aurp futures, purchased on July 1st currently in am in negative profit due to price movement.

Question

While i have NRML position for AURO and wait for the price to drop for me to gain
Can i initiate a MIS position on the same futures AURO ? 

Can you please explain with an example

		[Reply](#comment-146630)

						Karthik Rangappa says:		

			[July 13, 2020 at 8:12 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-146741)		

Yes, you can.

		[Reply](#comment-146741)

						Dilip says:		

			[July 11, 2020 at 8:34 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-146111)		

Hi,

I would like to know if we can expect full fledged knowledge series on FnO like Hedging, Adjustments, Strategies etc..

Awaiting reply.

Regards,
Dilip

		[Reply](#comment-146111)

						Karthik Rangappa says:		

			[July 12, 2020 at 9:59 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-146236)		

We have a ton of content here already, Dililp. Is there anything, in particular, you are looking for?

		[Reply](#comment-146236)

						amit says:		

			[June 29, 2020 at 1:26 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-142455)		

Thanks for the article explaining the leveraged gains and losses in detail. 

1. Would request a change in the article though - to bring out the risks in leveraged trades better . And critically important for investor education.
The exact sections i would like to refer to are Sections 4.4 and 4.5 . The losses table in Section 4.5 are harder to understand than the gains table at 4.4 .  To be precise - Section 4.5 deals with the results (losses) expressed in \"loss per share\" , whereas in section 4.4 the results (gains) are displayed in percentage terms. Reason being that the retail trader, like me, would  like to know his the extent of loss as well as the loss percentage for a directional bet gone wrong. what happens when the spot price drops 5% or 10% in a futures contract (using the same example in 4.4 ) Can i loose more than just the margin money ?  (yes as per your reply to other comments).  

2. are both losses and gains unlimited in either direction ?

		[Reply](#comment-142455)

						Karthik Rangappa says:		

			[June 29, 2020 at 7:59 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-142539)		

Amit, thanks for the suggestion. I will try and see what best I can do about this.  Yes, in a futures contract both are theoretically unlimited.

		[Reply](#comment-142539)

						Krishant says:		

			[June 26, 2020 at 10:55 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-141631)		

Sir, you said that if one buys a stock he has to wait 2 days to take the delivery and in order to sell whenever its the right time. Also that he cannot sell the stocks anytime before. But when I place CNC orders and the stock happen to make a big jump the next day or the day after, I can easily square off my position and exit. Why is it so?

		[Reply](#comment-141631)

						Karthik Rangappa says:		

			[June 27, 2020 at 11:03 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-141730)		

That\'s right, this is called a BTST trade. Do check this - https://zerodha.com/z-connect/queries/stock-and-fo-queries/btstatst-buyacquire-today-sell-tomorrow

		[Reply](#comment-141730)

						Prasad says:		

			[May 26, 2020 at 12:43 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-132505)		

Very good articles! Thank you! In subsection 4.4 I think it should be 1/42.17 = 2.3%&#8230;There is a typo (41.17).

		[Reply](#comment-132505)

						Karthik Rangappa says:		

			[May 26, 2020 at 9:06 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-132620)		

Ah, thanks for pointing that out, Prasad.

		[Reply](#comment-132620)

						Rohit Kinger says:		

			[May 8, 2020 at 11:06 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-126684)		

Still have a little doubt about margin.

Lets say I have 5000rs as fund balance. And I want to Short Axis bank which is currently at 400 rs. Margin calculator shows I can buy 12 shares as CNC and 62 as MIS (5x Multiplier). When I try to buy it in the app as MIS, It shows 400 x 12 taking 4800 as margin. 

How do I buy  5x as shown in the calcluator?

		[Reply](#comment-126684)

						Karthik Rangappa says:		

			[May 8, 2020 at 10:37 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-126849)		

YEs, that\'s could be the margin, but the number of shares can be 62. Please go with the calculator.

		[Reply](#comment-126849)

						Akash says:		

			[May 7, 2020 at 12:41 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-126300)		

can you please explain the difference between money creation and transfer with examples&#8230;?

		[Reply](#comment-126300)

						Karthik Rangappa says:		

			[May 7, 2020 at 8:35 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-126404)		

Have explained that in this module at various points, Akash 🙂

		[Reply](#comment-126404)

						Aravinth kalaiselvan says:		

			[April 23, 2020 at 12:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-122086)		

hey Karthik, 

1) How does Zerodha finance the remaining amount of our future contract (we only pay some percentage of the amount we should pay as margin)? Like someone has to pay right? Do banks pay the remaining? And do we have to pay any interest? 

2) And what happens if my future margin(SPAN + Exposure) gets exhausted overnight? Say something huge happened to the underlying investment instrument? Of course, I\'ll get a margin call. But will I have to pay anything extra, even if I don\'t want to continue my position?

		[Reply](#comment-122086)

						Karthik Rangappa says:		

			[April 23, 2020 at 7:52 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-122198)		

		1) The client is obligated to pay the broker dues, failing which a legal case can ensue
2) Yes, as long as you have an open position you are obligated

		[Reply](#comment-122198)

						Srikanth Arugula says:		

			[April 21, 2020 at 11:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-121608)		

Hello Sir!

First off thanks for these brilliant lessons. Really make it easy to understand these concepts.
One doubt I had was regarding your mention about Futures being a “Zero Sum Game”. As you said in the spot market one can hold shares for a long time and benefit off of the performance of the company. But the performance of the company is what causes someone else to buy the trade at a higher value which explains the higher cost of the share. In both the cases, some other party has to buy at a higher value to increase the price of the trade be it futures or spot market.

Then how are they different? Isn’t derivatives just a virtual wrapper over the existing spot market?

Sorry if this question feels repetitive but did not want to have any doubt in my fundamentals about the markets.

Thanks in advance 🙂

		[Reply](#comment-121608)

						Karthik Rangappa says:		

			[April 22, 2020 at 10:45 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-121694)		

What differentiates is the fact that if the company tends to do well, even the guy who has bought at higher levels can create wealth. When I say \'create wealth\', I\'m talking about new wealth being generated. In derivatives, money from one person\'s pocket moves to another. No new wealth is created. Hence the zero-sum tag.

		[Reply](#comment-121694)

						Suresh Nair says:		

			[April 10, 2020 at 2:15 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-118226)		

Were do we find the expiry for Comodities.

For futures its the last thursday of every month.Is it the same for Comodity,Crude oil?

		[Reply](#comment-118226)

						Karthik Rangappa says:		

			[April 10, 2020 at 4:57 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-118277)		

For each commodity, expiry is different, not fixed like equity.

		[Reply](#comment-118277)

						Akash says:		

			[April 4, 2020 at 12:58 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-116381)		

		Sir
I have following query:
In the above TCS Futures example, suppose the BUYER of TCS Futures does the deal at Rs. 2362 but the SELLER of TCS Futures as SHORTED the TCS Futures at say Rs. 2800. In this case, even if TCS stock price goes up say to Rs. 2600, both the BUYER of TCS Futures and SELLER of TCS Futures are making profit. Who is making loss in this case?

		[Reply](#comment-116381)

						Karthik Rangappa says:		

			[April 4, 2020 at 12:58 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-116485)		

Not sure if I understand your query completely, but here is the thing, in a futures mkts the buyer\'s loss is the seller\'s profit and vice versa.

		[Reply](#comment-116485)

						Veeresh Kerur says:		

			[March 12, 2020 at 10:19 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-111371)		

Hello,

If i have money 20000+ in my account, in there i have sold 1 lot Zinc mini @155 on date 3/10/2020 hold for next 3 days and next day (3/11/2020) Silvermic bought 1 lot @ 46480 Position. but  1st day (3/10/2020) charge 193 @ as Net obligation. on next day (3/11/2020) 983 rs charged for Net obligation. 

Can you please explain how it was charged.

		[Reply](#comment-111371)

						Karthik Rangappa says:		

			[March 13, 2020 at 1:27 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-111570)		

Veeresh, I\'d suggest you speak to our customer helpdesk for this. They will explain all the charges for you.

		[Reply](#comment-111570)

						Janesh says:		

			[February 24, 2020 at 3:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-108700)		

When you say \"Once we buy the stock (for delivery to DEMAT) we have to wait for at least 2 working days before we can decide to sell it.  \". So we can\'t sell on next day..??

		[Reply](#comment-108700)

						Karthik Rangappa says:		

			[February 25, 2020 at 11:14 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-108846)		

Technically you can buy today and sell tomorrow (BTST)&#8230;however, ensure the stock is eligible for BTST trades.

		[Reply](#comment-108846)

						Janesh says:		

			[February 23, 2020 at 8:47 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-108547)		

		Hello Karthik,
Thanks for writing good article. I have couple of questions.
1). As we buy in equity we become as % involved in particular company. So what about when we buy Futures.. ?
2). As in equity its transferred to DMAT account.. what\'s in Future contact?
3). Can we sell equity in next trading day.. as of today in Feb 2020.

		[Reply](#comment-108547)

						Karthik Rangappa says:		

			[February 24, 2020 at 2:47 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-108692)		

		1) Equity shares exist for long, but futures contract has an expiry. So no ownership when you buy futures
2) Held in the trading account
3) Yes, you can do buy today sell t\'row trades.

		[Reply](#comment-108692)

						Adithya Shourie says:		

			[December 6, 2019 at 11:19 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-97052)		

		Hi Karthik,
Lucid explanation as always. Kudos to you for making this an exciting journey (I have also read Stock Market Basics, TA & FA on Varsity). 

PS: Varsity app is really useful. It was really helpful as our understanding about the concepts could be measured by taking quizzes. But it has only four chapters. Can you please update the app on iOS? It would be awesome to read concepts on the go instead of opening a browser on the phone. Thanks

		[Reply](#comment-97052)

						Karthik Rangappa says:		

			[December 6, 2019 at 1:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-97073)		

Thanks for the kind words 🙂 

The app is available on iOS, the same version as the andriod. We are making a few changes though.

		[Reply](#comment-97073)

						Sumeet Chavan says:		

			[November 15, 2019 at 12:13 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-94273)		

		Hello sir
What if i buy two lots worth margin of  40,000 each, and the total shares bought amount to about 5 lakhs.
If the share price rises i benefit even if i dont have 5 lakh rupees.( As i had to pay the margin amount ). But what if the price falls? Will i incur loss on the initial amt of 5 lakhs? And if yes. Isnt futures too risky??

		[Reply](#comment-94273)

						Karthik Rangappa says:		

			[November 15, 2019 at 12:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-94294)		

Yes, the futures P&L works linearly. All leveraged products are risky 🙂

		[Reply](#comment-94294)

						Gaurav Pareek says:		

			[November 8, 2019 at 11:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-93402)		

Hey! Amazingly written. I\'ve a query

Let\'s say for example I\'ve a bought a KOTAKBANK NOV 1600 CE NFO (NRML) on 8th Nov 2019 Lot Size [[email&#160;protected]](/cdn-cgi/l/email-protection)
If KOTAKBANK hits beyond 1600 on expiry date which will be 28th Nov 2019. If I hold this NRML on expiry date and KOTAKBANK closes at 1650 what will be my profits? and if in case contract expires what will be my loss? I will be losing premium amount which I paid?

Also, do I have to deposit full amount for eg 1650 (Kotak Share Price in Spot Market) @ 800 = 13,20,000 when the contract matures. Also, is there a limit like I\'ve to buy the actual lot after T+7 days

Sorry for so many questions 🙂 I\'m new here. Thank you for your help once again 🙂

		[Reply](#comment-93402)

						Karthik Rangappa says:		

			[November 9, 2019 at 9:41 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-93413)		

		At 1650, the long 1600CE will be profitable by Rs.50. There is no loss here 🙂
There is physical settlement now, check this on how a long call option will be settled - https://support.zerodha.com/category/trading-and-markets/margin-leverage-and-product-and-order-types/articles/policy-on-physical-settlement

		[Reply](#comment-93413)

						Pradip says:		

			[November 7, 2019 at 3:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-93263)		

		Hlw sir,
 I am new in this field.
I have some queries.
For holding (nrml) buying & selling in stock future minimum capital required&#8230;??
Can I buy & sell any day the stok future for this particular month.

		[Reply](#comment-93263)

						Karthik Rangappa says:		

			[November 8, 2019 at 5:46 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-93352)		

Each contract has a different margin requirement. You can check the same here - https://zerodha.com/margin-calculator/SPAN/

		[Reply](#comment-93352)

						Vinod Kumar says:		

			[November 5, 2019 at 6:46 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-92994)		

Hi Karthik,

Thanks for the modules and great & simple info though to understand how stock market works. Comments under each module clears all the doubts that arise at the end of completing each module. 🙂

		[Reply](#comment-92994)

						Karthik Rangappa says:		

			[November 6, 2019 at 11:18 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-93090)		

Glad to note that, Vinod. Happy reading 🙂

		[Reply](#comment-93090)

						Sai Prakash says:		

			[September 26, 2019 at 11:40 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-88831)		

Hi sir, nowadays the f&o margin requirement seems to be very high when calculating in margin calculator. Is it correct? For example to buy 1lot of tatasteel it\'s showing \"313254\" needed, meanwhile the actual price is only around \"400000\". Is anything wrong with the system or leverage is less?

		[Reply](#comment-88831)

						Satish says:		

			[May 16, 2019 at 9:09 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-80308)		

		Good evening sir,
Sir i want to know is this leverage applicable for intraday, or normal future contract?&#8230;..And sir where we can see future contract in demat account?

		[Reply](#comment-80308)

						Karthik Rangappa says:		

			[May 17, 2019 at 11:44 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-80331)		

You can see the margin applicable for each stock/index futures here - https://zerodha.com/margin-calculator/SPAN/ . Btw, the futures contract will not appear in your DEMAT, it will show up in Kite\'s positions tab.

		[Reply](#comment-80331)

						neeraj says:		

			[April 16, 2019 at 7:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-78897)		

sir, can you explain me the difference between spot intraday and future intraday?

		[Reply](#comment-78897)

						Karthik Rangappa says:		

			[April 17, 2019 at 12:30 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-78932)		

Both are intraday, except that in the spot you have to sq off the short position within the day but in futures, you can choose to roll over.

		[Reply](#comment-78932)

						Shailendra says:		

			[March 29, 2019 at 10:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-78101)		

Some broker say that they provide 2 times margin in future market what does it mean

		[Reply](#comment-78101)

						Karthik Rangappa says:		

			[March 30, 2019 at 8:01 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-78127)		

It means for every 100, you can buy/see for 300.

		[Reply](#comment-78127)

						SadhaSivam S says:		

			[November 27, 2018 at 8:27 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71519)		

Hi Karthick,. 

Why can\'t we buy the future and rollover everymonth and hold it for long term for 3 years like investment that on a stock or index instead of buying the stock. Will there be any impact ?

		[Reply](#comment-71519)

						SadhaSivam S says:		

			[November 27, 2018 at 8:25 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71518)		

Hi Karthick,. 

Why can\'t we buy the future and rollover everymonth and hold it for long term for 3 years like that on a stock or index. Will there be any impact ?

		[Reply](#comment-71518)

						Karthik Rangappa says:		

			[November 28, 2018 at 12:45 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71558)		

It\'s just that you will have to bear with all the mark to market swings plus you will have to roll over every month. Hence not a great idea according to me.

		[Reply](#comment-71558)

						SadhaSivam S says:		

			[November 28, 2018 at 7:06 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71584)		

Karthick, just to confirm ,if we roll over everymonth, we are actually lossing the value of difference between the prices for those months right? On average Which would come around 5% to 8% in one year right?

		[Reply](#comment-71584)

						Karthik Rangappa says:		

			[November 29, 2018 at 11:26 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71616)		

I\'ve never estimated this, but yeah you will lose a bit begin caught between the premium and discount.

		[Reply](#comment-71616)

						raj says:		

			[November 25, 2018 at 1:45 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71334)		

So my leverage is directly decided by what the margin is? Can I decide to increase my leverage or decrease my leverage and if I can, how will I do it?

		[Reply](#comment-71334)

						Karthik Rangappa says:		

			[November 25, 2018 at 9:26 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71365)		

Yes, the leverage is decided by the margins.

		[Reply](#comment-71365)

						Shailendra says:		

			[November 21, 2018 at 9:52 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71176)		

		Is trading in spot market money creation or money transfer
Is money transfer a bad thing like gamble

		[Reply](#comment-71176)

						Karthik Rangappa says:		

			[November 22, 2018 at 1:09 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71213)		

Its wealth creation, Shailendra. Its not a bad thing 🙂

		[Reply](#comment-71213)

						Mahesh says:		

			[November 10, 2018 at 1:02 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-70440)		

		Leverage and pay off,  very nicely explained.
Here is one query
1. I strictly intend to trade intra day only
2. I am allowed to trade in to normal equity for up to Rs. 400000 (40xDeposit say 10000)
3. In this case,  if I decide to go for futures of equivalent sum (4 lakhs accommodating approx 1 lot of YesBank)  I need to keep MIS margin of about Rs. 45000
4. How come the leveraged trade is advisable in such case,  what are monetory pros and cons
Thanks

		[Reply](#comment-70440)

						Karthik Rangappa says:		

			[November 10, 2018 at 6:48 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-70498)		

		1) Sure, no problem
2) We don\'t provide 40X leverage. Also, as a suggestion, it is best if you avoid excess leverage
3) Yes
4) Leverage can make or break your capital, Mahesh. Have explained in detail in the chapter.

		[Reply](#comment-70498)

						Pavan says:		

			[November 7, 2018 at 3:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-70225)		

Sir , is there any way we can know leverages ratio of each stock future in a table calculated on daily basis .is anything similar or a calculator available on ZERODHA  or somewhere else ?

		[Reply](#comment-70225)

						Karthik Rangappa says:		

			[November 8, 2018 at 11:22 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-70252)		

No Pavan, however, you get the margin information, you can calculate the leverage ratio with this.

		[Reply](#comment-70252)

						Naina says:		

			[October 14, 2018 at 8:01 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-68711)		

		Hi 🙂
Querry -  traded nifty futures 1 lot with margin . What\'s amount to be recorded in futures Purchases & future sale?
Contract purchase cost - 7lakh
Sold future contract - 7.016Lakh
Margin when purchased 10,000.
Margin When sold 11,600.

What amount to be recorded for accounting purpose?

		[Reply](#comment-68711)

						Nakul Kularni says:		

			[October 15, 2018 at 2:22 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-68764)		

You will have to record the contract value for accounting. Your profit will be the difference between the sell value and the buy value. In the above case; 7,01,600 - 700000 = 1600 will be your profit.

		[Reply](#comment-68764)

						Naina says:		

			[October 16, 2018 at 7:39 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-68793)		

Ok. & turnover = ?

		[Reply](#comment-68793)

						Nakul Kularni says:		

			[October 16, 2018 at 10:47 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-68803)		

You may calculate the futures turnover as the sum of absolute profits and losses. The turnover for options can be calculated as the sum of absolute profits and losses and the sell value. 

For example, let\'s say you executed the following trades:

NIFTY SEP FUT: Buy Value - 7,00,000; Sell Value - 7,01,600; Profit - 1,600; Turnover - 1600
NIFTY OCT FUT: Buy Value - 7,10,000; Sell Value - 6,80,000; Profit - (30,000); Turnover - 30,000 (Absolute Value)
                             Total Futures Turnover - 1,600 + 30,000 = 31,600
NIFTY SEP 10500 CE: Buy Value - 20,000; Sell Value - 32,000; Profit - 12000; Turnover - 44,000
NIFTY OCT 10800 CE: Buy Value - 20,000; Sell Value - 12,000; Profit - (8,000); Turnover - 20,000 (Sum of absolute profit and sell value)
                                      Total Options Turnover - 44,000 + 20,000 = 64,000
                                      Total F&O Turnover - 31,600 + 64,000 =  95,600

This has been explained in greater detail under chapter 6 (Turnover, Balance Sheet, and P&L) in module 7 (Markets and Taxation)

		[Reply](#comment-68803)

						Akshay says:		

			[September 29, 2018 at 5:42 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-67944)		

Hi Karthik,

If we make a leveraged intraday equity long or short trade, would not the payoff be similar to trading futures expiring the same day?

Thanks,
Akshay

		[Reply](#comment-67944)

						Karthik Rangappa says:		

			[September 29, 2018 at 10:34 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-67987)		

Sort of, especially if you have quantities similar to the lot size.

		[Reply](#comment-67987)

						Srinivas says:		

			[August 22, 2018 at 1:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65599)		

Hi - excellent tutorial.

Let\'s take two scenarios. Assuming one has a corpus of 10 lakhs. Scenario 1. Buy 10 lakhs worth HDFC stock, hold for 12 months and then exit at the available price, and Scenario 2. Buy 10 lakhs worth HDFC in Futures with a margin of say 1 lakh and keep rolling them over every month. Also deposit the remaining 9 lakhs cash in a Bank FD generating 7% (just an example).

How would one evaluate the returns of these two scenarios? Scenario 1 has access to Dividends, scenario 2 would not. What other costs would one need to account for in scenario 2 e.g. (roll-over cost, cost of margin etc)?

		[Reply](#comment-65599)

						Srinivas says:		

			[August 22, 2018 at 1:16 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65600)		

i must correct my statement - given the daily M2M requirement, let\'s assume the remaining 9 lakhs is held in a liquid debt fund, as opposed to a bank FD. As and when additional margin is required, funds are transferred from the liquid debt fund to the trading account and vice versa.

		[Reply](#comment-65600)

						Karthik Rangappa says:		

			[August 23, 2018 at 12:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65634)		

Yeah, but the question is, why would you want this additional headache? There are no incremental gains with this structure, given the daily volatility will keep disturbing your investment in liquid funds.

		[Reply](#comment-65634)

						Karthik Rangappa says:		

			[August 23, 2018 at 12:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65633)		

If the idea is to hold for long term, you are better off deploying the capital in the stock. There is a daily mark to markets on the futures position, so you may have to pull funds from the 9L corpus. Besides, there will be a rollover etc, which will add to the cost of holding the futures position.

		[Reply](#comment-65633)

						omkar says:		

			[August 19, 2018 at 8:32 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65430)		

		hello sir,
as you said that if the stock price goes down 14%, you will lose all your margin money&#8230;but what if hypothetically stock went down 20%, so will your position get squared off after 14% down automatically coz your margin money is lost and you cant pay more loss?
thnk you

		[Reply](#comment-65430)

						omkar says:		

			[August 19, 2018 at 8:49 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65432)		

sorry just  readed the next chp&#8230;.got my answer

		[Reply](#comment-65432)

						Karthik Rangappa says:		

			[August 20, 2018 at 12:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65463)		

Good luck, Omkar!

		[Reply](#comment-65463)

						Karthik Rangappa says:		

			[August 20, 2018 at 12:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65462)		

Yes, technically the position will get squared when the margins go below the stipulated SPAN margin requirement.

		[Reply](#comment-65462)

						Guru says:		

			[August 17, 2018 at 1:38 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65316)		

Hi Karthik,

You mentioned futures is a zero sum game. For that matter, equity investment also is the same. Am I correct? In equity as well - wealth is not created rather just transferred from losers to winners (except on the IPO where the money goes to the company). Can you please clarify?

Kind regards,
Guru

		[Reply](#comment-65316)

						Karthik Rangappa says:		

			[August 18, 2018 at 10:34 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65350)		

Not really, you can buy stocks today and hold the same for years, all through which the capital appreciates and wealth is created.

		[Reply](#comment-65350)

						Amit K says:		

			[June 21, 2018 at 8:55 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-61365)		

Hi Sir,

 Can you please tell me if zerodha provides any leverage for overnight positions in futures? And if yes where can we find it the rates? All I could find on website is leverage for intraday trading.
Thanks.

		[Reply](#comment-61365)

						Karthik Rangappa says:		

			[June 21, 2018 at 12:01 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-61386)		

No extra leverage, Amit. You will have to have enough margins SPAN+Exposure to carry forward the positions.

		[Reply](#comment-61386)

						Harshad Patel says:		

			[June 12, 2018 at 5:23 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-60947)		

Hi Karthik, 

I read all your previous Module and Chapters. (just like school time study and also do homework&#8230;)

Anyways, can you please tell me how to keep patience with small volatility in future trading?

I ask you here because when I do spot Market trade (with 10 or up 50 Qty) I can ignore if it happens and hold until my target not complete but in the future trade, I must have to place an order with a 1 lot of (100 or more Qty), and it is very very hard to ignore.

So, please advice me as per your experience and knowledge.

Thanks
Harshad Patel

		[Reply](#comment-60947)

						Karthik Rangappa says:		

			[June 13, 2018 at 11:11 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-60989)		

Patience is a function of the overall capital you have plus how much of it you have exposed to the trade 🙂

		[Reply](#comment-60989)

						Pratik says:		

			[June 5, 2018 at 4:36 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-60554)		

		Sir, I am trading in options from last 6 months. But now after gaining confidence want to shift to futures. I trade only intraday. (Day trading) do not carry any positions overnight.
I want to ask in 10 lakh capital how many bank nifty contract can be traded intraday (MIS option in kite). I got confused in different type of margins.
I know it\'s stupid question but please help.

		[Reply](#comment-60554)

						Karthik Rangappa says:		

			[June 6, 2018 at 9:48 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-60584)		

You can roughly trade about 30 lots, but you may not want to use all the leverage here. This will be too much risk to carry. Check this - https://zerodha.com/margin-calculator/Futures/

		[Reply](#comment-60584)

						Vignesh says:		

			[June 1, 2018 at 10:25 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-60292)		

Sir please explain when I sell the stock with this margin concept

		[Reply](#comment-60292)

						Karthik Rangappa says:		

			[June 1, 2018 at 12:30 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-60325)		

I\'ve explained the same in this module, Vignesh. Can you kindly check once? Thanks.

		[Reply](#comment-60325)

						Adishwar says:		

			[May 2, 2018 at 11:53 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-58447)		

		Hi Karthik!
I am confused with Rs 17330 which you have mentioned here \"After committing Rs.82,670/- as margin amount for 2 lots, we would still be left with Rs.17,330/- in cash\"

		[Reply](#comment-58447)

						Adishwar says:		

			[May 3, 2018 at 12:15 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-58448)		

Oops! my Bad after deducting 82670 from Rs100000 we get 17330.

 Just because of your promt replies to  my questions in technical and fundamental analysis I don\'t think twice asking questions. Will be logical from now on.

		[Reply](#comment-58448)

						Karthik Rangappa says:		

			[May 3, 2018 at 7:40 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-58473)		

Lol 🙂 

Not a problem at all, Adishwar 🙂

		[Reply](#comment-58473)

						Karthik Rangappa says:		

			[May 3, 2018 at 7:39 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-58472)		

I\'m guessing 17,330 is the cash left in the account over and above 82670 which is used as margin deposits for 2 lots.

		[Reply](#comment-58472)

						Adishwar says:		

			[May 3, 2018 at 10:45 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-58490)		

Yes got it. Thanks ?

		[Reply](#comment-58490)

						Karthik Rangappa says:		

			[May 3, 2018 at 9:12 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-58517)		

Cheers!

		[Reply](#comment-58517)

						GIRISH says:		

			[April 10, 2018 at 12:38 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-57031)		

		Sir,
just for curiosity
suppose i have Rs 100000 in my account
and i buy  xyz future , req 98000 margin then Rs 2000 remaining in my account

if stock goes down and i want to carry it for next few day 

it is required to maintain any amount in my account for every day ????
if yes then how ?

		[Reply](#comment-57031)

						Karthik Rangappa says:		

			[April 10, 2018 at 11:10 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-57056)		

It is always good to have some extra funds in your account to accommodate extreme market moves. The 98K margin is further split between SPAN and exposure. Your position will be automatically cut once your losses exceed exposure margin plus the 2K in your account.

		[Reply](#comment-57056)

						prabu says:		

			[March 27, 2018 at 11:42 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-56232)		

		is there interest to be paid for leverage taken ? and also explain what is
Span ,Exposure, margin Total margin shown in margin calculator

		[Reply](#comment-56232)

						Srivatsa says:		

			[March 13, 2018 at 2:47 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-55326)		

Hi Karthik, 

I must admit the content on Future Trading is really explained beautifully.
However at the risk of sounding stupid, I have a basic question that\'s been nagging me.
Suppose there is a Future contract for a company ABC ending 28th March at 833 with a lot size of 1000.
But the CMP is already 845. 
What if I want to buy such a contract assuming that price will go even higher.?
Is such a scenario possible?
Please let me know
Many thanks

		[Reply](#comment-55326)

						Karthik Rangappa says:		

			[March 13, 2018 at 3:47 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-55344)		

Yes, it certainly is possible. Here you are speculating that the price will go up by Rs.12, and hence make 12K on it. Likewise, if you have an opposite view that the share price will drop to 800, you can short it with a hope of making 33K.

		[Reply](#comment-55344)

						Arun says:		

			[March 11, 2018 at 5:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-55234)		

		You shattered the mountain 🙂
very good.novice can understand easily !!!
Thanks a lot for this.

		[Reply](#comment-55234)

						Karthik Rangappa says:		

			[March 12, 2018 at 11:10 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-55264)		

Thanks for such kind words, Arun 🙂

Good luck and happy learning!

		[Reply](#comment-55264)

						Priyam Gupta says:		

			[February 17, 2018 at 8:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-53937)		

		Hi Karthik,
Suppose I have a Future contract of PC jewellers jan @500 ,lot size 1500 and suppose I paid 1.5 lac Rs for this contract.
Now for some reason next day it fell down to 200 so I am seeing a loss of (500 - 200 = 300&#215;1500 = 450000) . So Do I need to pay this much amout or my position will get square off automatically before that. And What If I don\'t have the remaining amount to pay off ?

		[Reply](#comment-53937)

						quickgainer says:		

			[February 17, 2018 at 8:33 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-53938)		

Wew dude you are rekt tbh

		[Reply](#comment-53938)

						Karthik Rangappa says:		

			[February 18, 2018 at 4:33 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-53963)		

This is an example where the fall is quite dramatic and sudden. The position will make a loss (exceeding the margin required) and therefore the position will be closed by your broker&#8230;.and you are legally bound to make good the losses to the broker.

		[Reply](#comment-53963)

						Priyam Gupta says:		

			[February 19, 2018 at 8:30 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-54053)		

		Thanks for your reply Karthik,
I am having one more doubt, just in case If I am unable to pay off my debt to the broker as I don\'t have any more money, no business, no job, no property means I have nothing. I have already blown my full savings here then what legal action will be taken against me?

		[Reply](#comment-54053)

						Karthik Rangappa says:		

			[February 20, 2018 at 8:21 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-54074)		

I\'m really not sure, Priyam. Let me check with the legal team 🙂

		[Reply](#comment-54074)

						Priyam Gupta says:		

			[February 21, 2018 at 9:04 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-54168)		

Yeah sure, Please check and let us aware 🙂

						Karthik Rangappa says:		

			[February 22, 2018 at 12:47 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-54214)		

Done.

						priyam gupta says:		

			[March 1, 2018 at 11:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-54658)		

Hi karthik, I am still waiting for your reply 🙂

						Venu Madhav says:		

			[March 2, 2018 at 2:26 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-54703)		

Similar to how a client can file a complaint against a broker, a broker can also file a complaint against the client if there are any defaults due from the client. The Exchange will process the complaint, follow the necessary procedures and pass a ruling either in the favor of the broker or the client. In case the client isn\'t paying up, then the broker can include the client\'s details in the list of defaulters: http://bit.ly/2FeGwUV

		[Reply](#comment-54703)

						trader says:		

			[February 13, 2018 at 7:23 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-53449)		

why zerodha bo co intraday futures margin for stock futures got reduced to 33.3 from 55.5? till when is it expected to be like this?

		[Reply](#comment-53449)

						Karthik Rangappa says:		

			[February 14, 2018 at 11:29 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-53483)		

Request you to check this - https://tradingqna.com/t/why-has-zerodha-increased-intraday-trading-margins-for-bo-co-mis-citing-added-volatility/32697?page=2 , thanks.

		[Reply](#comment-53483)

						Srikanth Chintala says:		

			[January 28, 2018 at 9:00 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-52393)		

Hi Sir,

My Doubt is how does Futures benefit the market as a whole as it is not creating wealth but transferring wealth. 

Earlier futures is used to trade physical material like gold/coffee where the farmer and trader both benefit to some extent as the  product will be purchased in advance and reduce the risk of volatility and improve there business.
But in shares futures are used just for the sake of price prediction and there is not underling business which benefits.

My doubt is if futures is not wealth creation, why is SEBI regularizing it?

		[Reply](#comment-52393)

						Karthik Rangappa says:		

			[January 28, 2018 at 7:53 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-52420)		

Check this interview, this will give you a fair sense of what is possible - http://www.moneycontrol.com/news/business/markets/jack-schwager-interview-market-wisdom-from-the-wizard-himself-2492507.html

		[Reply](#comment-52420)

						Vikrant says:		

			[January 26, 2018 at 8:38 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-52304)		

		Hello,
Just one doubt. When you say zero sum game, who shells out the money for the expired contracts, where the contract has neither been sold(buyer) or bought(short seller) by the holder. TIA

		[Reply](#comment-52304)

						Karthik Rangappa says:		

			[January 27, 2018 at 3:48 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-52357)		

In that case, no mone (P&L) is actually exchanged, right?

		[Reply](#comment-52357)

						SIMRAN says:		

			[January 21, 2018 at 2:39 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-51980)		

		Hello Sir,
I haven\'t understood the Leverage Calculation part.
Could you please explain it to me ?
 Thanks!

		[Reply](#comment-51980)

						Karthik Rangappa says:		

			[January 22, 2018 at 11:19 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-52013)		

Can you point to which part you\'ve not been able to understand?

		[Reply](#comment-52013)

						Santosh says:		

			[January 13, 2018 at 6:17 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-51309)		

		Hello Karthik,
Thank you for wonderful content and making new traders or investors life easy. I have a question on Zero Sum Game. I agree to the point that trading in futures incur either profit or loss and that will replicate on counter party. Is it not true in spot market too? if someone is making profit means someone has to make loss? Does it not mean, if I make profit in spot market it is also coming from counterparty or a new trader who enters the market?  I understand in futures it is very soon or can say one trader will make loss immediately and in large amount, which is less in spot market unless if stock price will be bullish only.
Example - Assume a company registers in Exchange and issue an IPO at Rs/- 150 (I\'m considering to explain from beginning b\'coz it\'s the time when a company enters into a market and people start to trade). After 10 days, price of stock is Rs/- 160, I think to square off my stock having Rs/- 10 as a profit, now I need to look for someone who agrees or wish to buy at Rs/- 160. This means a new trader will enter a market and buy from me or invest, he doesn\'t make loss, however he is paying from his pocket.
Consider a two possible situations,
1. if the price goes up i.e. Rs/- 165 in next 10 days, the trader is happy as he made profit,
2. what if price goes down to Rs/- 155, he is making Rs/- 5 loss? Here he is making loss after 10 days of his investment. No one can ever make loss in market if we always have bullish, which is not possible. 

To summaries, from my understanding a person trading in futures will make profit or loss in short term, similarly a person trading in spot market will make profit or loss either in short term or long term. Hence for me Zero Sum Game is not an appropriate phrase used to explain futures and also it is quite difficult to agree that future trading is not a creation of money. Please correct me if I am wrong. 

Thank you. 

Best regards
Santosh

		[Reply](#comment-51309)

						Karthik Rangappa says:		

			[January 13, 2018 at 9:21 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-51327)		

Agreed, Santosh. Trading in F&O is a zero-sum game, however, this is not really true in the spot market.

		[Reply](#comment-51327)

						sravan says:		

			[January 10, 2018 at 7:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-51183)		

		Hi sir,
Suppose at the end of contract i.e on expiry date TCS share price falls by more than 14% and let us suppose i have some 20k rs left in my account apart from that margin amount(14% of contract value). Clearly in this situation i have few doubts
1.does the contract square off automatically when blocked margin gets zero.
2.or the contract continues with remaining 20k balance till the trading account becomes ZREO.
Plz explain in detail especially the 2nd question?
Thanks in advance sir.

		[Reply](#comment-51183)

						Karthik Rangappa says:		

			[January 11, 2018 at 11:12 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-51208)		

		1) Yes, the RMS team at the broker\'s office will square off the position
2) No - moment the margins go below the SPAN, the position will be squared off

		[Reply](#comment-51208)

						yogesh says:		

			[January 8, 2018 at 5:50 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-51077)		

Sir, if I buy a futures contract (1 lot) of NMDC on 8th jan 2018( Expiry is on 25th Jan 2018) and currently future price of NMDC 162.2. I put the required margin in the trading account.  Now if the futures price of NMDC goes down say by 5 rs in 1-2 days, then will i need to add more money to my trading account?  Will I get any notification from Zerodha about it?

Regards,
Yogesh

		[Reply](#comment-51077)

						Karthik Rangappa says:		

			[January 9, 2018 at 10:50 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-51097)		

At any point (i.e after you initiate the trade), you need to ensure that the margin maintained is equal to SPAN + Exposure. As long as this margin is in place, you need not really worry about margin calls.

		[Reply](#comment-51097)

						Aakash says:		

			[January 3, 2018 at 7:37 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-50776)		

Here we only have to pay the margin amount to get into future trading .Suppose at the end of contract i.e on expiry date TCS share price falls by more than 14% and  let us suppose i have no money in my account apart from that margin amount(14% of contract value). Clearly in this situation i will not be able to pay total money to the opposite party.How this defaulter situation will be solved in this case?

		[Reply](#comment-50776)

						Karthik Rangappa says:		

			[January 4, 2018 at 11:36 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-50823)		

The Risk management team at the broker\'s end will ensure your position is squared off.

		[Reply](#comment-50823)

						Rajesh says:		

			[December 26, 2017 at 10:50 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-50389)		

		Explaination is simple.. Thank you
What is initial margin(Span) and Exposure margin?

		[Reply](#comment-50389)

						Ajit says:		

			[December 26, 2017 at 10:40 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-50388)		

As futures is a contract between 2 persons, if one person squares off, does another also gets squared off automatically? Like if I am sellling TCS at 1500 today and tomorrow future price is 1499, and buyer(Second Person) squares off, for any reason. Does my contract as a Seller still remains valid?

		[Reply](#comment-50388)

						[Faisal Mohammed](http://zerodha.com/varsity) says:		

			[December 27, 2017 at 3:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-50421)		

Your contract will still remain open. The buyer would have squared off his position to another buyer in the market(This could be a fresh buyer or another seller who was willing to square-off). This is covered in the chapter on Open Interest

		[Reply](#comment-50421)

						Punita says:		

			[December 24, 2017 at 4:58 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-50288)		

Hi

Please explain what happens on expiry of Future purchase. For e.g. I purchased TCS shares for Dec 17 and upon expiry if future price is less than my purchase price how it will get settled.

thanks

		[Reply](#comment-50288)

						Karthik Rangappa says:		

			[December 25, 2017 at 1:57 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-50317)		

Futures is marked to market. So if you have made a loss, the same will be adjusted on a daily basis.

		[Reply](#comment-50317)

						Savan Patel says:		

			[December 17, 2017 at 9:54 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-49964)		

I do not get last line of this chepter \"Linear Pay-off &#8230;\"?

		[Reply](#comment-49964)

						Karthik Rangappa says:		

			[December 17, 2017 at 1:07 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-49971)		

By linear pay off I mean that for every 1 point increase in price, the P&L also increases by 1 point. Likewise for a decline of 1 point. So both the price and P&L vary in the same proportion, hence its referred to as a \'linear payoff\'.

		[Reply](#comment-49971)

						harshl says:		

			[November 30, 2017 at 12:15 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-49050)		

		sir my question ia margin related plase ans one by one
1) Margin used equity not future any example through  make profit example advice me
2) Any you tube video buy and sell using marg
3) Any zerodha  any chapter reding in only equity margin is please prvide me
4) zerodha using margin make 1 lk profit in case uaing margin 50,000 thousand imake profit 200% in my casb is it true
4) please guide me uaing exmple

		[Reply](#comment-49050)

						Karthik Rangappa says:		

			[November 30, 2017 at 11:28 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-49078)		

		1) Buy Infy Futures at 980, sell at 985. Profit of Rs.5
2) Suggest you attend the daily demos we conduct here - https://www.youtube.com/user/zerodhaonline
3) The next chapter has these details
4) Yes, if you make 1L out of 50K margin, then you make 100% profits.

		[Reply](#comment-49078)

						harshl says:		

			[November 23, 2017 at 12:43 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-48636)		

		sir
1)how many times are use margin in different stocks
2) any problem to do maximum stocks trade by using margin
3)any charges
4) any restriction to trade only one stocks trade using margin
5) can i use daily margin in one stocks
please answer me in one by one

		[Reply](#comment-48636)

						Karthik Rangappa says:		

			[November 23, 2017 at 11:58 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-48660)		

		1) You can use margins as many times as you wish
2) No
3) https://zerodha.com/charges
4) No
5) Yes.

		[Reply](#comment-48660)

						Dev75 says:		

			[October 29, 2017 at 12:43 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-47224)		

		Hi Karthik,
This is my first post on Zerodha platform. Hats off to you and your team for commendable n high quality content.
Very few has this god gift to put complex subjects to its bare essentials.
I have few newbie questions
1) Is it any difference between Leverage and MIS? If yes, what is that?
2) Can u provide the link about list of companies operating in F &O segment?
3) What is the minimum and maximum duration of futures contract?
Thanks

		[Reply](#comment-47224)

						Karthik Rangappa says:		

			[October 30, 2017 at 2:08 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-47258)		

Glad you liked the content, Dev. 

1) An MIS order is leverage. Leverage means you can buy/sell for more money than what you have in your account
2) Check this - https://zerodha.com/margin-calculator/Futures/
3) Depends on the contract - 30,60, or 90 days max.

		[Reply](#comment-47258)

						Megh says:		

			[October 27, 2017 at 1:12 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-47111)		

Suppose I am trading intraday in futures and have traded twice in a single day. For eg let\'s say first trade margin required was Rs1000/- and profit earned was Rs100/- Next trade was also same with margin required Rs1000/- and profit earned was Rs110/-

So now how do we calculate ROI shall we add the margins on both trade meaning 1000+1000 =2000 and profit 100+110=210/- and ROI=210/2000 = 10.5% or 210/1000 = 21%. Which one is the correct method of calculating? 

At the end of the month, it will help to calculate the ROI monthly.

		[Reply](#comment-47111)

						Karthik Rangappa says:		

			[October 28, 2017 at 11:51 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-47142)		

If your intention is to calculate the ROI at the end of month, then its quite simple. Do the following - 

Starting capital on the 1st day of the month  = 1000
Ending capital on the last day of the month = 1200
ROI = 200/1000
=20%.

		[Reply](#comment-47142)

						Megh says:		

			[October 28, 2017 at 9:40 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-47182)		

		Hi,
This means no matter how many times we trade, each time amount invested in the trade is not added at the end of the month. IS this right way of calculating ROI because every time we trade we invest that amount as margin money..

		[Reply](#comment-47182)

						Karthik Rangappa says:		

			[October 29, 2017 at 11:33 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-47213)		

Yes, but then the margins keep varying. The method I\'ve suggested is very simple and straightforward.

		[Reply](#comment-47213)

						Bharadwaj says:		

			[October 24, 2017 at 3:15 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-46966)		

Hi Karthik, 

What if the future price fall lower than the margin?

Thank you

		[Reply](#comment-46966)

						Karthik Rangappa says:		

			[October 25, 2017 at 10:45 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-46992)		

If you wish to carry forward the position, then you will have to bring in additional margins, failing which your position may get squared off.

		[Reply](#comment-46992)

						Tushar says:		

			[October 20, 2017 at 2:54 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-46803)		

		Hi there
Can you please explain the concept of MIS Multiplier. I checked the equity calculator, it says for MIS for ACC stock for instance i can purchase 14x shares. But say i am doing intraday trade on ACC and for instance the current share price is rs 100 and it says I can purchase 14x shares, so do i need to pay 14 x 100 =1400 rs ? I didnt understand how this works, can you elaborate please?

		[Reply](#comment-46803)

						Karthik Rangappa says:		

			[October 20, 2017 at 5:59 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-46815)		

Let\'s say you have 75K in your account and you intend to buy a share whose stock price is 75. The number of shares you can buy is -

75000/75

=1000 

However, if you intend to do MIS, you can leverage your capital and buy higher number of shares. Considering the leverage as 14x, you can buy -
14285 shares, roughly 14 times more than what you can buy otherwise.

		[Reply](#comment-46815)

						Tushar says:		

			[October 20, 2017 at 9:48 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-46830)		

Thanks for your prompt response. But say suppose my account has 75,000 but I want to utilize only 10,000 for a particular share and take the leverage. That would obviously be possible right?

		[Reply](#comment-46830)

						Karthik Rangappa says:		

			[October 21, 2017 at 12:18 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-46850)		

Yup, possible. Just replace 75K with 10K and recalculate.

		[Reply](#comment-46850)

						Sachin says:		

			[October 5, 2017 at 3:22 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-46107)		

Great learning&#8230;thanks for this.   Well Futures and Options are aliens to me but I will learn it&#8230;.so far gained good knowledge.

I have one doubt suppose I buy 1 lot of DHFL 26-Oct-2017 expiry futures today that is 05-Oct-2017 @ 557.35 what happens if I do not square off position and let it expire on 26-Oct-2017 and assume price of DHFL futures is 600 on 26-Oct-2017.  Will I get profit of 63,975?  (1500*600 - 1500*557.35)

		[Reply](#comment-46107)

						Karthik Rangappa says:		

			[October 6, 2017 at 8:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-46144)		

Yes, you will get profits! No need to square off the position. Happy learning!

		[Reply](#comment-46144)

						Suren says:		

			[September 29, 2017 at 12:49 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-45850)		

Hi kartik. If I buy Dec 2017 nifty futures today in September 2017 is it necessary to square off on 24 Oct or I can keep it till Dec 17. Thanks

		[Reply](#comment-45850)

						Karthik Rangappa says:		

			[September 30, 2017 at 10:48 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-45873)		

The December contract expires in December, not really in Oct.

		[Reply](#comment-45873)

						shyam says:		

			[September 16, 2017 at 8:50 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-45144)		

Kartik, you have explained leverage beautifully by clearing all concepts. Thanks to you and your team.

		[Reply](#comment-45144)

						Karthik Rangappa says:		

			[September 17, 2017 at 8:24 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-45184)		

Thanks, Shyam. Happy learning!

		[Reply](#comment-45184)

						Dinesh Kukreja says:		

			[September 9, 2017 at 9:46 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44727)		

Excellent Write ups. I am Glad that you have kept it free to read. Many Thanks for Knowledge Sharing !!!

		[Reply](#comment-44727)

						Karthik Rangappa says:		

			[September 10, 2017 at 11:04 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44757)		

Happy learning, Dinesh!

		[Reply](#comment-44757)

						Maha says:		

			[August 31, 2017 at 11:32 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44175)		

Hello Karthik,

The way you have explained and the summarisation along with case study and the reply to each query of the market participants are mind blowing. I was having big fear on stock market. But, now i am gearing good confidence. Thanks a lot for the knowledge sharing

		[Reply](#comment-44175)

						Karthik Rangappa says:		

			[September 1, 2017 at 7:24 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44212)		

Thanks for the kind words and encouragement, Maha 🙂

		[Reply](#comment-44212)

						anu says:		

			[August 29, 2017 at 7:19 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44081)		

Hi Karthik, I would like to thank you for guiding us so patiently and perfectly through Varsity. I have a few queries though regarding leveraged trades in the equity cash market:

1) Since max leverage for BO/Co is 20 times, suppose i use cover order/bracket order and initiate a position by taking 10 times leverage of my account value,  then can i take another leveraged trade of 10 times before closing the old trade?

2) if a security is not allowed for shorting but i click on sell and try to open a short position then what will happen?

3) If by using a BO/CO with maximum leverage I make some profit and close a trade, then can i use the profits for another leveraged trade on the same day?
   For eg. I made Rs. 1000 as profit with a capital of Rs. 20k in intraday using leverage at 12pm. Then can i open another leveraged trade at 12.05 pm by taking Rs.21K as margin (which will be Rs. 420000 after applying 20 times leverage)?

		[Reply](#comment-44081)

						Karthik Rangappa says:		

			[August 30, 2017 at 10:39 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44113)		

		1) Depends on how much cash you are exposing. Co check this for approximate margin values - https://zerodha.com/margin-calculator/SPAN/
2) You order will not go through
3) Yes, you can.

		[Reply](#comment-44113)

						naarayanan says:		

			[July 25, 2017 at 6:54 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-42335)		

futures mis is more effective than equity  mis , is it? it seems so from margin calculator.

		[Reply](#comment-42335)

						Karthik Rangappa says:		

			[July 26, 2017 at 7:43 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-42358)		

Futures is a leveraged product, you tend to get a higher leverage when you place MIS.

		[Reply](#comment-42358)

						Ajay says:		

			[June 27, 2017 at 9:08 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-41230)		

Let\'s say I have Rs. 1 lakh in my account. 

I purchase 2 lots of XYZ company futures at Y% leverage. This is such that the price exceed the total deposit in my account, which is 1 lakh. Suppose there\'s a loss, will I lose the entire amount in my trading account? And after that if there\'s something remaining to cover the amount, can the debtor be sued?

		[Reply](#comment-41230)

						Karthik Rangappa says:		

			[June 27, 2017 at 12:08 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-41246)		

The way the risk mgmt system is developed is that it wont let you lose all the money in your account plus more. Moment your margins go below the required SPAN, the position will be squared off.

		[Reply](#comment-41246)

						vishant says:		

			[April 26, 2019 at 5:43 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-79437)		

span mean span margin?

		[Reply](#comment-79437)

						Karthik Rangappa says:		

			[April 27, 2019 at 10:58 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-79451)		

Yes, SPAN margin.

		[Reply](#comment-79451)

						[AnandhaMurugan](https://zerodha.com/varsity/chapter/leverage-payoff/) says:		

			[June 18, 2017 at 11:40 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40939)		

		Hello KARTHIK,
For EX, if i hold 3 months contract, is it possible to not involve in trade on intermediate days within these 3 months contract time?

		[Reply](#comment-40939)

						Karthik Rangappa says:		

			[June 19, 2017 at 8:01 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40956)		

Yes, you can just buy the contract and wait till expiry.

		[Reply](#comment-40956)

						Jay says:		

			[May 29, 2017 at 4:14 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40368)		

Hello Karthik,

In addition to above query in point.1 ,  to use leverages in MIS, do i need to choose any specific option in trade window. for example, I have Rs.20,000/- in my trade account and in case i want to execute 2 leverage trading for 2 different stocks with the capital of Rs.10,000/- to each. Once my order for 1st stock executed using leverage (if no specific option is avaialble to choose whether its leverage or normal MIs trade). how come there will be some balance in my account to buy another stock. As per my understanding, if total buy value is Rs.100,000/- all the amount in my account (i.e., Rs.20,000) will be taken away for 1st purchase and Rs.80,000 will be leverage instead Rs.10,000 needs to be taken and Rs.90,000 as leverage.  So, that i cuyan use the remaining Rs.10,000 to buy another stock. please extend your guidance.

		[Reply](#comment-40368)

						Jay says:		

			[May 29, 2017 at 4:00 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40366)		

		Hello Karthik,
    Im a beginner in Trading, I have some silly doubts. Hope you can help me to understand the things. So far i never executed leverage trades, please let me know whether my below understanding is correct in point 1.
  Point. 1) In case i have Rs.10,000 in my trading account. i would i like to by X stock worth Rs.500 each. it has leverage of 9X in MIS as per zerodha margin calculator. Using that leverage I can buy 181 stocks, instead 20. And it is under the condition either profit or loss I need to square off before 3:20 PM.  As per Zerodha brokerage calculator my profit is Rs.130.45, in case i sell for Rs.1 profit. No other charges for the entire transcation I made.

Point. 2) What is the benefit for brokerage firms when they give leverages to their customer and what are all the criterias taken into account to fix the leverage for each stock? This question is based on curiosity.

		[Reply](#comment-40366)

						Karthik Rangappa says:		

			[May 29, 2017 at 7:12 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40381)		

		1) Yes, that is how leverage works. Charges applicable are shown on the brokerage calculator. Besides this, stamp duty charges are levied. However, this is not a big component.
2) Traders prefer to trade with leverage as they believe it is an efficient use of capital. Brokers are expected to provide this, a least on an intraday basis. Consider this as a value added service 🙂

		[Reply](#comment-40381)

						Jay says:		

			[May 31, 2017 at 10:08 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40418)		

JAY

May 29, 2017 at 4:14 pm
Hello Karthik,
In addition to above query in point.1 , to use leverages in MIS, do i need to choose any specific option in trade window. for example, I have Rs.20,000/- in my trade account and in case i want to execute 2 leverage trading for 2 different stocks with the capital of Rs.10,000/- to each. Once my order for 1st stock executed using leverage (if no specific option is avaialble to choose whether its leverage or normal MIs trade). how come there will be some balance in my account to buy another stock. As per my understanding, if total buy value is Rs.100,000/- all the amount in my account (i.e., Rs.20,000) will be taken away for 1st purchase and Rs.80,000 will be leverage instead Rs.10,000 needs to be taken and Rs.90,000 as leverage. So, that i cuyan use the remaining Rs.10,000 to buy another stock. please extend your guidance.

		[Reply](#comment-40418)

						Karthik Rangappa says:		

			[May 31, 2017 at 12:16 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40424)		

When you choose MIS, it implies that you are seeking intrday leverage. I\'d suggest you use the calculator here. For example with 10K, I can buy only 100 shares in CNC whereas 300 odd shares under MIS. Check this - https://zerodha.com/margin-calculator/Equity/

		[Reply](#comment-40424)

						Jay says:		

			[May 31, 2017 at 5:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40433)		

		Is that mean,in case my cash balance is 20k and I can buy 2 different shares in MIS with base amount 10K each using margin in a same time?
And in Leverage I can buy only in market price or I can also place order using SL?

						Karthik Rangappa says:		

			[June 1, 2017 at 11:26 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40449)		

Yes, you can distribute the money across 2 stocks if you want. You can place a limit order under MIS. 

						Jay says:		

			[June 1, 2017 at 4:25 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40461)		

Let us assume I have Rs.50 lakh in trading account, i could see Amaraja Batteries with 14X leverage. In case I wish to use it, the total value cross Rs.5 crore. Is that possible to buy for this much big price&#8230; Because I remember, somewhere i read the total value cross Rs. 5 crore or total volume minimum 5 lakh is block deal( it will happen through separate window between institutional investors) and trading of 0.5% of the number of equity shares of a listed company is bulk deal and It must be reported to exchange by brokers on daily basis&#8230; please clarify.

						Karthik Rangappa says:		

			[June 1, 2017 at 11:57 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40473)		

Leverage is provided in the futures and options segment&#8230;.so you can probably buy 5Cr of stocks via futures with 50L capital. The bulk and block deal you are talking about is mainly for Equity delivery trade.

						Rahul says:		

			[May 27, 2017 at 1:15 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40267)		

		1. Will i have to pay back leverage after trade?
2. Suppose, i have 1000 rs and i got a leverage of 500rs and my bet size increases to 1500rs, what if i got a profit of 3000rs,  will the leverage be deducted from my trading a/c?

		[Reply](#comment-40267)

						Karthik Rangappa says:		

			[May 27, 2017 at 6:34 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40292)		

		1) No leverage is just provided to you&#8230;no paying back as such.
2) No, it does not work that way. You will be allowed to initiate a position worth 1500 with just 1000.

		[Reply](#comment-40292)

						Rahul Sharma says:		

			[May 20, 2017 at 11:45 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40045)		

		HI karthik Sir
I am big fan of zerodha. No doubt zerodha is one of the best and fastest growing brokerage house.
Your service are really very good.
But as far as leverage is concerned, zerodha is far behind.
Many discount brokers provide 4x leverage or more (intraday) but zerodha provide 2.5X
One broker provide facility of interday position only on span margin
Why these zerodha does not provide? Zerodha is much bigger and more reputated, have more clients.
However BO CO require less margin but can not be placed for banknifty on Thursday
Please reply

		[Reply](#comment-40045)

						Karthik Rangappa says:		

			[May 21, 2017 at 6:13 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40072)		

Thanks Rahul. Providing excess leverage is not really a big thing for a broker, but the real question to ask is - 

1) Is it good for the client?
2) Is it good for the business?

The answer is no for both.

		[Reply](#comment-40072)

						prats says:		

			[December 3, 2018 at 12:58 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71819)		

Leverage should be in proportional to the Trader\'s net worth and not a blanket one. A blanket leverage of 2.5x doesn\'t mean it is beneficial. For a trader with high net worth but less capital, good amount of leverage is better. Anyways , we can see now more or less leverages for MIS have been 3x or above for most of the stocks

		[Reply](#comment-71819)

						Karthik Rangappa says:		

			[December 4, 2018 at 10:04 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-71852)		

We are conservative with providing leverage.

		[Reply](#comment-71852)

						Ankit says:		

			[May 20, 2017 at 9:38 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40041)		

		Hi karthik ,
I want to know about GTM orders. Can be placed in indian market or not?

		[Reply](#comment-40041)

						Karthik Rangappa says:		

			[May 21, 2017 at 6:06 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-40070)		

Nope, all orders are flushed out at the end of the day. No carry forward orders.

		[Reply](#comment-40070)

						Ayush says:		

			[May 9, 2017 at 11:56 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39614)		

3. In case of equity if my leverage in more than 23 times in CO/BO, can\'t i enter the trade?

		[Reply](#comment-39614)

						Karthik Rangappa says:		

			[May 10, 2017 at 5:55 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39628)		

3) Leverage depends on the stock, if leverage is provided, you can take the a leveraged position.

		[Reply](#comment-39628)

						Ayush says:		

			[May 9, 2017 at 11:50 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39613)		

		1. What is the maximum leverage one can get using CO or BO in equities?
2. What is the maximum leverage one can get in futures using MIS,BO or CO?

		[Reply](#comment-39613)

						Karthik Rangappa says:		

			[May 10, 2017 at 5:54 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39627)		

		1) https://zerodha.com/margin-calculator/BracketCover/
2) https://zerodha.com/margin-calculator/Futures/ (MIS order margin is applicable for CO/BO)

		[Reply](#comment-39627)

						Ayush says:		

			[May 4, 2017 at 12:49 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39347)		

Will there be any initial margin deduction while shorting the futures?

		[Reply](#comment-39347)

						Ayush says:		

			[May 4, 2017 at 12:58 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39348)		

From above example what if the price drops by 14%,  what will happen to my 2lot which i have purchased, will my lots be automatically transfered?

		[Reply](#comment-39348)

						Ayush says:		

			[May 4, 2017 at 1:00 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39349)		

Why cant we get leverage in spot market?

		[Reply](#comment-39349)

						Ayush says:		

			[May 4, 2017 at 2:44 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39351)		

		Is it right to enter future trade on the basis of charts or through the info and news related to company,
       OR
Both

		[Reply](#comment-39351)

						Ayush says:		

			[May 4, 2017 at 9:30 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39357)		

Can i put a stoploss on my order?so, that if the price falls to SL my lot will be automatically sold?

						Karthik Rangappa says:		

			[May 4, 2017 at 11:47 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39381)		

Yes, but its always a good idea to double check if your SL is executed.

						Karthik Rangappa says:		

			[May 4, 2017 at 11:46 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39378)		

Both.

						Karthik Rangappa says:		

			[May 4, 2017 at 11:45 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39376)		

You can - try placing MIS/BO/CO order on spot. However, these are intraday orders, you cannot carry them over.

		[Reply](#comment-39376)

						Karthik Rangappa says:		

			[May 4, 2017 at 11:44 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39375)		

Your position will most likely get squared off.

		[Reply](#comment-39375)

						Karthik Rangappa says:		

			[May 4, 2017 at 11:44 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-39374)		

Same as long futures. Check the margin calculator - https://zerodha.com/margin-calculator/SPAN/

		[Reply](#comment-39374)

						Suryaveer says:		

			[April 20, 2017 at 8:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-38748)		

		First, thanks for such wonderful tutorials.
Second, I had a question, please don\'t mind the silliness of the question. I am a complete greenhorn.  THe question being, are there any mini or micro lots in futures contract as well? Can we do micro or a mini futures contract for the TCS? or its just the standard lot size?
Thanks

		[Reply](#comment-38748)

						Karthik Rangappa says:		

			[April 21, 2017 at 11:31 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-38767)		

There were mini lots on Nifty available, not any more I guess. It would be nice to have them back.

		[Reply](#comment-38767)

						sko5prasad says:		

			[April 16, 2017 at 5:32 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-38611)		

		Hi Karthik,
How one can earn profit also by shorting the TCS share as mentioned in the above lesson ?
Regards,
Sachin

		[Reply](#comment-38611)

						Karthik Rangappa says:		

			[April 17, 2017 at 10:58 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-38623)		

When you short you profit when the stock price goes down.

		[Reply](#comment-38623)

						Kirit Dave says:		

			[March 12, 2017 at 12:31 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-36959)		

		Dear Sir,
I am new to Zerodha & trading as well as. I am learning. I found your way of explanation very good and quite understandable.
Thanks & regards,
Kirit

		[Reply](#comment-36959)

						Karthik Rangappa says:		

			[March 13, 2017 at 10:18 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-37004)		

Thanks for the kind words, Kirit. Happy leaning.

		[Reply](#comment-37004)

						Karthik Rangappa says:		

			[March 13, 2017 at 10:19 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-37005)		

Thanks for the kind words, Kirit. Happy learning.

		[Reply](#comment-37005)

						jswalia888 says:		

			[March 10, 2017 at 2:19 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-36867)		

		sir help me let assume       2% margin    contract value rs 100 = 2rs margin    is that
leverages =contract value / margin    so    =100/2= 50                so 1:50                u said    1:10 value best       so in this case   1:50 mean   high leverages

		[Reply](#comment-36867)

						Karthik Rangappa says:		

			[March 10, 2017 at 2:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-36873)		

Yes, 1:50 is extremely high leverage.

		[Reply](#comment-36873)

						Nihal says:		

			[February 15, 2017 at 2:12 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-35773)		

		Hi,
In continuation with above question , with Zerodha in Cash segment(MIS)  why there is not provided same leverage for all shares ?

		[Reply](#comment-35773)

						Karthik Rangappa says:		

			[February 15, 2017 at 4:32 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-35785)		

Yes, you can trade using MIS product type to trade in cash segment. Check this to figure out how much leverage - https://zerodha.com/margin-calculator/Equity/

		[Reply](#comment-35785)

						Nihal says:		

			[February 13, 2017 at 3:54 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-35699)		

		Hi karthik,
i have one doubt , if i have limited balance in my trading account and not able to get any futures , with the same amount can i deal in cash market ? am i able to get leverage ? how much % ? (specially in case  Cash Market - Intraday -MIS )
or i need to purchase shares worth of my balance only ? if i get leverage is it necessary to put SL in cash market ?
i hope i hv nt made u confused.  :-!

		[Reply](#comment-35699)

						dhawal says:		

			[February 5, 2017 at 3:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-35380)		

keep it up zerodha ..varsity

		[Reply](#comment-35380)

						Karthik Rangappa says:		

			[February 6, 2017 at 10:54 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-35416)		

Cheers!

		[Reply](#comment-35416)

						mohit_1607 says:		

			[February 1, 2017 at 11:55 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-35109)		

Excellent karthik..wonderful explanation..thnx a lot

		[Reply](#comment-35109)

						Karthik Rangappa says:		

			[February 2, 2017 at 9:34 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-35124)		

Cheers!

		[Reply](#comment-35124)

						Mohan Kabra says:		

			[January 25, 2017 at 8:06 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34901)		

Can we assume that about 270 companies which are registered for F&O are more or less better than the remaining companies?

		[Reply](#comment-34901)

						Karthik Rangappa says:		

			[January 26, 2017 at 7:15 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34917)		

No&#8230;.its just that these 270 companies have a wider market participation and therefore the volumes and trading activity are higher. Hence, they qualify for F&O. It have nothing to do with the actual performance of the company.

		[Reply](#comment-34917)

						Mohan Kabra says:		

			[January 25, 2017 at 8:03 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34900)		

I understand Warren Buffet has said that Financial derivatives are financial disasters for individuals and that they are fit only for corporates and institutions. What do you say about it?

		[Reply](#comment-34900)

						Karthik Rangappa says:		

			[January 26, 2017 at 7:13 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34916)		

The only difference between corporates and individuals is the depth of pockets. End of the day, corporates are also run by humans and they too can burn up derivative positions. 

The key, according to me is learning how these instruments work and setting realistic expectations around what can be achieved with these instruments.

		[Reply](#comment-34916)

						Vishal Oturkar says:		

			[January 24, 2017 at 2:20 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34841)		

		Hi Karthik,
there are lots of companies which r nt listed in derivatives  , i mean i cn nt find there Future contract on NSE nor with Zerodha.
some of them are.
Tata Metaliks , Delta Corp LTD , MMTC Ltd , Coromandel International , Gujarat Pipavav Port Ltd. etc.
can you please confirm why this is so.
Thanks for your GR888 Study material.
Cheers.

		[Reply](#comment-34841)

						Karthik Rangappa says:		

			[January 25, 2017 at 11:25 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34867)		

There are only about 270 companies listed under the F&O segment 🙂

There are a set of trading criteria required for a company to qualify for listing in this segment&#8230;and as you can see, at this point only 270 odd companies qualify.

		[Reply](#comment-34867)

						salim says:		

			[January 23, 2017 at 5:50 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34800)		

		Please correct this line , it will be (spot - strike) as it is long on trade not short. And you have mention (strike - spot)
(As the table suggest, you would make a loss of Rs.202/-per share (2362 – 2160).)

		[Reply](#comment-34800)

						Karthik Rangappa says:		

			[January 24, 2017 at 11:09 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34826)		

Salim - Can you please help me by pointing out the exact place where you found this line?

		[Reply](#comment-34826)

						p.shunmugaperumal says:		

			[January 23, 2017 at 1:32 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34777)		

This module help me learn more things about future trade i have few doubts  regarding margin and leverage  if increase leverage  the margin will decrease vice versa  obviously  because margin is inversely proportional to leverage  if i have a good balances and i choose a minimum lot size can I increase my leverage size

		[Reply](#comment-34777)

						Karthik Rangappa says:		

			[January 23, 2017 at 11:43 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-34796)		

Yes, they are. Please feel free to add your queries here and we will be happy to answer them for you.

		[Reply](#comment-34796)

						Khan says:		

			[December 12, 2016 at 9:11 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-33512)		

		Great work Karthik!
I tried to buy futures of a stock I wanted to trade in but couldn\'t find any. Later I realized, no all stocks listed have futures. Why so?

		[Reply](#comment-33512)

						Karthik Rangappa says:		

			[December 13, 2016 at 11:15 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-33531)		

Stocks have to match certain criteria to get listed under F&O. Check this - https://www.nseindia.com/products/content/derivatives/equities/products.htm

		[Reply](#comment-33531)

						sagar kumar nayak says:		

			[December 4, 2016 at 2:18 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-33236)		

The article is great.  it only takes me through the profit part of leverage. but how the loss is calculated? lets take that we have a future cont. of 250 and lot size is 1000. so i take 2 lots that is 500,000. the leverage is 1:12. the req amount is 38,461. and i have a 40,000 in my account. i take a trade and 38,461 is deducted from my account which leaves me at 1539. now i want to know when there will be a margin call ? lets say the 250 value changes to 248. this makes a loss of 4000 and makes my future contract value to 496,000. so will there be a margin call ? or what is the condition at which my trades will be automatically sold and margin call will be done?

Please do suggest a solution.

		[Reply](#comment-33236)

						Karthik Rangappa says:		

			[December 4, 2016 at 10:10 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-33250)		

Margin charged = SPAN + Exposure margin. You can see the split up between the SPAN and exposure here - https://zerodha.com/margin-calculator/SPAN/. 

For you to safely trade without any margin call, you need to ensure there is money in your account to the extent of SPAN (at least), all the time, during your trade\'s lifetime.

		[Reply](#comment-33250)

						John says:		

			[September 13, 2016 at 5:31 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-31255)		

Thankyou So much.

		[Reply](#comment-31255)

						Karthik Rangappa says:		

			[September 14, 2016 at 11:31 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-31285)		

Welcome!

		[Reply](#comment-31285)

						John says:		

			[September 10, 2016 at 4:14 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-31180)		

Does it really makes a difference if i invest through Bse or Nse.

		[Reply](#comment-31180)

						Karthik Rangappa says:		

			[September 10, 2016 at 8:29 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-31194)		

Nope, after all its the same share.

		[Reply](#comment-31194)

						Dinesh says:		

			[August 21, 2016 at 8:38 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-30701)		

Do we have bracket order possible on futures?

		[Reply](#comment-30701)

						Karthik Rangappa says:		

			[August 22, 2016 at 12:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-30723)		

Yes.

		[Reply](#comment-30723)

						Maha says:		

			[August 31, 2017 at 11:17 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44173)		

Hello Karthik,

Please can you explain What is bracket order ?

		[Reply](#comment-44173)

						Karthik Rangappa says:		

			[September 1, 2017 at 7:21 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44210)		

Check this - https://zerodha.com/z-connect/tradezerodha/zerodha-trader-software-version/bracket-orders-trailing-stoploss-sl

		[Reply](#comment-44210)

						Maha says:		

			[September 1, 2017 at 8:41 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44249)		

Thanks Karthik

						Karthik Rangappa says:		

			[September 2, 2017 at 10:18 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-44308)		

Welcome!

						vishnu says:		

			[August 8, 2016 at 2:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-30350)		

If we need minimum T+2 days to sell a share in a spot market which we own already, then how one do  intraday trading?

		[Reply](#comment-30350)

						Karthik Rangappa says:		

			[August 9, 2016 at 12:45 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-30377)		

Its not T+2 Vishnu. When you sell from your demat, for all practical purpose the stocks are flushed out from you account the day day. However, while doing an intraday trade, you do not take stock to delivery so there is no question of settlement from the exchange at all.

		[Reply](#comment-30377)

						Madhusudan says:		

			[August 5, 2016 at 2:25 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-30239)		

		Hi again,
As i see in above chapter,U have used 2362 as a buy price for stock buy and future buy price and 2519 as stock sell and future sell??If this is the case then is there no meaning to the running future index and its separate prices??I hope you understand .please revert asap??

		[Reply](#comment-30239)

						Karthik Rangappa says:		

			[August 5, 2016 at 11:43 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-30261)		

Sorry, I\'m unable to understand your query. Can you kindly elaborate?.

		[Reply](#comment-30261)

						vishal says:		

			[July 6, 2016 at 12:20 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-29223)		

		In chapter  3, from the example of TCS,  what I was able to understand is-
- the price of TCS futures expiry 24DEC2014 is 2374.9, down by 93.05 points, 3.77%  .
- underlying value i.e the current price of TCS stock is 2359.95  .
- so if one buys TCS futures expiry 24DEC2014 @ 2374.9, this means if price goes beyond 2374.9, on or before 24 DEC 2014, one will gain.

I was not able to match what i understood in TCS example, with my observation in tata power futures price as  stated above.

		[Reply](#comment-29223)

						Karthik Rangappa says:		

			[July 7, 2016 at 11:42 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-29261)		

Yes, for you to be profitable, TCS futures (or any futures in general) has to move up beyond your entry price.

		[Reply](#comment-29261)

						VISHAL says:		

			[July 6, 2016 at 11:58 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-29221)		

		Hi Karthik,
I was just checking  the futures price of Tata power(Expiry 28 July, 2016), on Moneycontrol app, it was quoted at73.5, down by 0.6 points, 0.81%, & the closing price of tata power stock was 74.3, down by  0.6 points,  0.8%  .
So is it possible to buy Tata power futures, @73.5,  as the price of Tata power stock is 74.3    .

		[Reply](#comment-29221)

						Karthik Rangappa says:		

			[July 7, 2016 at 11:34 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-29259)		

Yes, as long as you strongly believe the discount will be bridged and the futures price will move up!

		[Reply](#comment-29259)

						vishal says:		

			[July 5, 2016 at 10:16 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-29201)		

		hi karthik,
can anyone , sell the future contracts the same day , if price rises?

		[Reply](#comment-29201)

						Karthik Rangappa says:		

			[July 6, 2016 at 8:35 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-29213)		

Yes, you can.

		[Reply](#comment-29213)

						ABHISHEK says:		

			[June 27, 2016 at 2:31 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-28961)		

		Sir
I have a query. Say I have Rs 1lac in my account and the contract value is Rs 295250 as per the above mentioned scenario. Although the margin is 14% of the contract value which I\'m able to pay with Rs 1 lac, but what about the remaining Rs (295259-41335(14%)). When do we have to pay the remaining about, do we have to pay it on the expiry date. If yes, what if I default and I don\'t have the remaining debt to be paid in my trading account?

Thanks!

		[Reply](#comment-28961)

						ABHISHEK says:		

			[June 27, 2016 at 2:40 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-28962)		

the above scenario is for the case if I want to hold on to the agreement till the expiry. Also, what will happen if no one decides to buy the future lot during the tenure and it just gets expired.

		[Reply](#comment-28962)

						Karthik Rangappa says:		

			[June 27, 2016 at 11:37 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-28977)		

All derivative contracts are settled in cash by the exchange upon its expiry, so you will not be in a situation where you hold a contract with no buyers/sellers.

		[Reply](#comment-28977)

						Karthik Rangappa says:		

			[June 27, 2016 at 11:36 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-28976)		

Abhishek - you need not have to pay up the remaining funds. Futures trading works just on margins and M2M.

		[Reply](#comment-28976)

						Sauvik Das says:		

			[May 25, 2016 at 12:51 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-26819)		

		Hello Karthik,
It is probable the best explanation and must read for any new comer , It really shows how clear you are in concept&#8230;
Thanks a lot

		[Reply](#comment-26819)

						Karthik Rangappa says:		

			[May 27, 2016 at 6:35 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-26839)		

Thanks Sauvik 🙂

		[Reply](#comment-26839)

						nitin k says:		

			[May 7, 2016 at 12:24 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-26370)		

Span margin calculator and equity margin calculators are showing different margin for same stock future. Why?

		[Reply](#comment-26370)

						Karthik Rangappa says:		

			[May 8, 2016 at 3:38 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-26383)		

Is it  for the same lot size/number of shares? Can you re check?

		[Reply](#comment-26383)

						dipen says:		

			[March 8, 2016 at 8:17 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-25326)		

very nice&#8230;. thank you sir.

		[Reply](#comment-25326)

						Karthik Rangappa says:		

			[March 9, 2016 at 3:50 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-25357)		

Welcome!

		[Reply](#comment-25357)

						dipen says:		

			[March 5, 2016 at 4:44 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-25239)		

		hello sir,
very nice and indepth chapter for futures trading.
as you mentioned \"zero sum game\", does it mean trading i futures no one makes money?
will u please elaborte&#8230;
thank u

		[Reply](#comment-25239)

						Karthik Rangappa says:		

			[March 6, 2016 at 5:52 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-25282)		

\'Zero sum game\' is a line used to describe the fact that money is transferred from one account to another. So, smart and sensible traders end up making tons of money.

		[Reply](#comment-25282)

						Varun says:		

			[February 2, 2016 at 6:24 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-24555)		

Margins are available from brokers for intraday trading. This also can be considered as leveraging right ? How different is this from the leveraging in the futures market ?

		[Reply](#comment-24555)

						Karthik Rangappa says:		

			[February 3, 2016 at 6:00 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-24574)		

In fact this is leverage 🙂

		[Reply](#comment-24574)

						PRASHANTH AV says:		

			[December 12, 2015 at 6:34 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-23528)		

		karthick,
                          you have written that once we buy the stock for delivery, even though a good oppurtunity comes next day for selling we cant sell it.right.       THEN HOW ARE BTST TRADES EXECUTED

		[Reply](#comment-23528)

						Karthik Rangappa says:		

			[December 13, 2015 at 12:51 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-23545)		

Well, you can sell the stock the very next day, but in a BTST trade there is the risk on short delivery..check the consequence of short deliver in a BTST trades here - http://zerodha.com/z-connect/queries/stock-and-fo-queries/consequences-of-short-delivery-nse-bse

		[Reply](#comment-23545)

						Ankit says:		

			[November 4, 2015 at 5:22 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22560)		

Sir i want to ask very simple question 

I want to buy about 15 shares of MRF. For this I have to spend money 39200*15= 59000 (approx). I have much more money than this  in my account.
I want to buy stock of this company only. Then what should I do, should I buy stock from spot market or from future market.
Besides leverage what other benefits are in future marketing trading

		[Reply](#comment-22560)

						Karthik Rangappa says:		

			[November 5, 2015 at 6:28 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22580)		

If you want the shares in your DEMAT account, then you will have to pay Rs.588,000/- and take delivery. If you trade Futures then you will have to accommodate for daily M2M etc.

		[Reply](#comment-22580)

						Manoj Naik says:		

			[November 3, 2015 at 3:14 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22515)		

Sir, Could you suggest me any site where i can get very good info on pricing of derivatives.

		[Reply](#comment-22515)

						Karthik Rangappa says:		

			[November 4, 2015 at 5:23 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22533)		

If you want just the price, nothing beat NSE 🙂

		[Reply](#comment-22533)

						Manoj Naik says:		

			[November 1, 2015 at 7:22 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22395)		

Sir,  Since forwards are OTC trades do we need to square off.?

		[Reply](#comment-22395)

						Karthik Rangappa says:		

			[November 2, 2015 at 5:34 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22427)		

Yeah, only after you square off the trade is said to be complete.

		[Reply](#comment-22427)

						Manoj Naik says:		

			[November 2, 2015 at 3:32 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22460)		

Hi Sir, In the example of gold we agree to buy gold at future price agreed upon. There will be another party who will sell the gold. On the date of settlement we will take the delivery of gold and the other party will get the money. So this trade is complete. My question is whether this trade can be called squared off or do i need to enter into counter position that is sell to square off.

		[Reply](#comment-22460)

						Karthik Rangappa says:		

			[November 3, 2015 at 8:57 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22489)		

Square off is a terminology used to convey the fact that position you opened is now closed.

		[Reply](#comment-22489)

						Manoj Naik says:		

			[November 3, 2015 at 3:09 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22514)		

Ok even the settlement of trade I can call it as square off. Thanks Sir for explanation

						Karthik Rangappa says:		

			[November 4, 2015 at 5:21 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22532)		

Yup.

						Manoj Naik says:		

			[October 31, 2015 at 3:17 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22370)		

Hi Sir, What does derivative pricing means?.What exactly goes in to derivative pricing.

		[Reply](#comment-22370)

						Karthik Rangappa says:		

			[November 2, 2015 at 5:20 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-22420)		

Manoj - Derivatives are financial products that are sort of \'made up\' to mimic the underlying price. Because these are completely different instruments, they need to be priced. Pricing of these instruments is what is generally called as \"Derivative Pricing\".

		[Reply](#comment-22420)

						jitendra says:		

			[October 16, 2015 at 12:51 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-20792)		

Simply superb modules

		[Reply](#comment-20792)

						Karthik Rangappa says:		

			[October 16, 2015 at 8:06 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-21472)		

Thank you 🙂

		[Reply](#comment-21472)

						Deepali says:		

			[October 9, 2015 at 12:21 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-20332)		

		Hi,
It is clear that the margin percentage varies  from stock to stock.
I have below queries:
1. the margin percentage is prescribed by the exchange, is it right?
2. where I can see this margin percentage ? is it available with BSE or NSE site?
3. How I can know the margin amount required before buying contract in zerodha terminal?

Thanks!

		[Reply](#comment-20332)

						Karthik Rangappa says:		

			[October 11, 2015 at 6:17 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-20437)		

		1) Yes, specifically SPAN margin is as per exchange\'s specification
2) You can use Zerodha margin calculator - https://zerodha.com/margin-calculator/SPAN/
3) Same as above.

		[Reply](#comment-20437)

						sudhi says:		

			[July 18, 2015 at 10:15 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-16113)		

clear and very informative

		[Reply](#comment-16113)

						Karthik Rangappa says:		

			[July 19, 2015 at 3:58 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-16132)		

Thank you!

		[Reply](#comment-16132)

						Ragunathan says:		

			[July 8, 2015 at 8:02 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-15667)		

Thank you sir&#8230;. -:)

		[Reply](#comment-15667)

						Karthik Rangappa says:		

			[July 10, 2015 at 4:43 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-15727)		

Welcome 🙂

		[Reply](#comment-15727)

						Ragunathan says:		

			[July 6, 2015 at 7:30 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-15556)		

Sir, I have a basic doubt&#8230; If the money made out of derivatives is coming from someone\'s pocket then is it morally a good trade? Is it not like a daytime burglary or pick pocket? Hope you will clarify my long time moral doubt.

		[Reply](#comment-15556)

						Karthik Rangappa says:		

			[July 7, 2015 at 5:36 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-15604)		

Sir, I\'m too inexperienced to talk about morality 🙂

However here is my 2 cents on this topic - market is the only institution of sorts where merit is respected. Over the long run the knowledgeable trader always wins over the ignorant. An ignorant trader is always rash with his money, market facilitates this transfer of money from the ignorant trader to the knowledgeable trader in the most legitimate way. Think about it - what makes a person ignorant? It is his lack of willingness to learn - in other words his laziness right :). 

So for all the hard work you put towards learning&#8230;you should be rewarded right? 🙂 The ignorant trader will do just that - reward you for the knowledge you possess!

		[Reply](#comment-15604)

						Ragunathan says:		

			[July 7, 2015 at 7:54 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-15618)		

sir, great&#8230;. i thought you would neglect my question&#8230;but you established you are a good teacher. Its correct, knowledge should be rewarded but the ignorant not rewarding a well versed trader voluntarily like in a teacher student relation..isn\'t it? definitely the looser whether he is ignorant or not will give the money to the gainer with tears&#8230; BUT IGNORANT CAME WITH GREED. HE PAY FOR HIS GREED. i know this is not an appropriate forum to discuss these type of morality questions because it\'s BUSINESS. if we calculate in this regard no one did trade and got profit from the beginning of the HISTORY. its my longtime worry that what im doing&#8230; sucking others money? but your answer somewhat compromised. yes no trader is perfect&#8230;every one gives and gets money from the market and vice versa. but the question here is how much is the percentage&#8230;.?

		[Reply](#comment-15618)

						Karthik Rangappa says:		

			[July 8, 2015 at 6:42 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-15652)		

Yes Raghunath, please don\'t think too much about these issues. As long as you are designing and executing your trades well you are doing the right job, please don\'t get worked on other matters. 

Good luck.

		[Reply](#comment-15652)

						samanth ch says:		

			[October 17, 2015 at 5:45 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-21772)		

sir namasthe i think whole this zerodha modules it was  gud query by raghu nd nice answer from u

						Karthik Rangappa says:		

			[October 18, 2015 at 2:34 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-21824)		

Namasthe 🙂 I\'m glad you like Zerodha Varsity and the interaction here !

						Shashi Shah says:		

			[June 19, 2015 at 3:05 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-14850)		

I had invested in the Trading symbol MARUTI15JULFUT which had 15 July expiry then - however, the 15 July expiry futures seem to have vanished now!  In place of the mid-month expiry futures, there are now month-end expiry futures.  Has the expiry now changed to 30 July - how can I know this?  I\'m trading via Zerodha - how can I know my current profit / loss?

		[Reply](#comment-14850)

						Karthik Rangappa says:		

			[June 19, 2015 at 5:47 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-14857)		

The expiry of Futures and Options contract has always been on the last Thursday of every month and never mid month. I have a feeling you may inadvertently misread the expiry dates.

		[Reply](#comment-14857)

						Muthu Selvan says:		

			[April 22, 2015 at 3:14 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-12093)		

Could u pl. explain BTST?

		[Reply](#comment-12093)

						Karthik Rangappa says:		

			[April 23, 2015 at 7:19 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-12181)		

Its explained here - http://zerodha.com/z-connect/queries/stock-and-fo-queries/btstatst-buyacquire-today-sell-tomorrow

		[Reply](#comment-12181)

						Sudarshan says:		

			[March 14, 2015 at 12:22 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-9683)		

Once we buy the stock (for delivery to DEMAT) we have to wait for at least 2 working days before we can decide to sell it. This means even if the very next day if a good opportunity to sell comes up, we cannot really sell the stock.

What you have mentioned above is wrong&#8230;

		[Reply](#comment-9683)

						Karthik Rangappa says:		

			[March 14, 2015 at 12:55 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-9684)		

Thanks for pointing this, in fact this was the first draft and I was to correct it in the 2nd draft, dont know how it skipped my attention. You are right, one can even do a BTST with the risk of short delivery.

		[Reply](#comment-9684)

						Martin says:		

			[August 31, 2018 at 5:48 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-66180)		

You have agreed to Sudarshan about the factual error, however, even after 4 years, it has yet to been rectified!

		[Reply](#comment-66180)

						Vidhyalakshmi says:		

			[January 20, 2015 at 1:57 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7599)		

The next chapter cleared all the fog around the subject. Thank you very much for explaining everything in such a light and lucid way!

		[Reply](#comment-7599)

						Karthik Rangappa says:		

			[January 21, 2015 at 8:50 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7615)		

Glad to know that, please stay tuned 🙂

		[Reply](#comment-7615)

						Vidhyalakshmi says:		

			[January 20, 2015 at 8:09 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7586)		

I have one more doubt. After I buy a lot of say TCS futures and it trades lower and lower for 3 subsequent days and on the 4th day goes back to the price point at which I bought it. Will the (negative) difference in price during those 3 days be deducted from my margin on a daily basis?

		[Reply](#comment-7586)

						Karthik Rangappa says:		

			[January 20, 2015 at 12:45 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7594)		

Yes, the negative difference will be deducted margins that you deposited. In fact I\'d suggest you read through the next chapter (http://zerodha.com/varsity/chapter/margin-m2m/) for better clarity.

		[Reply](#comment-7594)

						Vidhyalakshmi says:		

			[January 20, 2015 at 7:59 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7585)		

Hi Karthik. Thanks for taking the effort to clear our doubts. I have one regarding the costs of transaction (tax and charges). When I look at the brokerage calculator, I see a clear advantage in choosing intraday or FnO as a product type as opposed to delivery-based trades. My question is&#8230;\"Apart varying margin requirements, is there a difference in transaction costs between choosing to trade futures in NRML or MIS?

		[Reply](#comment-7585)

						Karthik Rangappa says:		

			[January 20, 2015 at 12:43 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7593)		

In fact chapter 7 (which is work in progress) talks about this in detail. However just to answer your question, the biggest difference is in terms of the margins that you need to deposit. Other charges (except brokerage) are calculated as a % of turnover hence it would not change much. Brokerage as you may know is flat at Zerodha (Rs.20/- per trade) and it does not really depend on anything.

		[Reply](#comment-7593)

						Mahesh Patil says:		

			[January 18, 2015 at 10:46 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7537)		

		Dear sir,
Please include topic on \"GAP\" in technical analysis.

		[Reply](#comment-7537)

						Karthik Rangappa says:		

			[January 19, 2015 at 4:52 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7548)		

Sure will do, meanwhile check section 10.1 in this chapter for now - http://zerodha.com/varsity/chapter/multiple-candlestick-patterns-part-3/

		[Reply](#comment-7548)

						sushil 12 says:		

			[January 17, 2015 at 10:00 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7511)		

sir next chapter plz&#8230;? 🙂

		[Reply](#comment-7511)

						Karthik Rangappa says:		

			[January 18, 2015 at 8:49 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7531)		

Coming up next week 🙂

		[Reply](#comment-7531)

						amit kumar says:		

			[January 17, 2015 at 5:38 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7506)		

Very good explanation kartik, I want to know how much will be profit and loss keeping brokerage and spot and future price different, kindly explain, once again hats off to u nd ur team for doing wonderful job, keep it up.

		[Reply](#comment-7506)

						Karthik Rangappa says:		

			[January 17, 2015 at 6:12 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7510)		

Amit thanks for your comment. Regarding the P&L post brokerage and other applicable charges, please do check out Zerodha\'s brokerage calculator - http://zerodha.com/brokerage-calculator

		[Reply](#comment-7510)

						S.R.Badrish says:		

			[January 17, 2015 at 1:43 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7496)		

		Hi, It gives a complete explanation about all the points pertaining to futures Trading. Should clear most of the doubts of a layman also.
Just wanted to mention one point-As far as my knowledge goes, as per the example when TCS is bougt as stock, we can sell the stock even before it comes to our DEMAT Account.
Anyhow Hats off to the entire team for their effort in putting up a module like this.

		[Reply](#comment-7496)

						Karthik Rangappa says:		

			[January 17, 2015 at 6:08 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7508)		

You are absolutely right, you can do BTST kind of trades, I was supposed to change that line, somehow I dint. Will make the necessary corrections. Thanks for highlighting the same.

		[Reply](#comment-7508)

						RAHUL says:		

			[March 17, 2015 at 11:44 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-9917)		

Hi Karthick can you please refer reading material for BTST trades (as mentioned above) for more clarity.

		[Reply](#comment-9917)

						Karthik Rangappa says:		

			[March 18, 2015 at 6:15 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-9998)		

Here you go - http://zerodha.com/z-connect/queries/stock-and-fo-queries/btstatst-buyacquire-today-sell-tomorrow

Please make sure you read through the comments as well. It contains rich information on the topic.

		[Reply](#comment-9998)

						Narayan says:		

			[November 4, 2018 at 9:40 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-70037)		

Looks like it\'s still not changed, even after 3 years!!

		[Reply](#comment-70037)

						Karthik Rangappa says:		

			[November 4, 2018 at 6:01 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-70062)		

What are you referring to?

		[Reply](#comment-70062)

						Santosh says:		

			[January 15, 2015 at 4:47 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7471)		

		Really nice detailed explanation, though some of us trade futures but do not know the underlying concepts.
Explanation on Leverage and Risk is beautiful.

		[Reply](#comment-7471)

						Karthik Rangappa says:		

			[January 16, 2015 at 5:12 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7480)		

Thanks Santosh, glad you liked it. It is in fact quite important to know the nature of beast as it helps us tame it better 🙂

		[Reply](#comment-7480)

						Rahul says:		

			[May 4, 2015 at 8:50 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-12802)		

Absolutely correctly said phrase. Hearty gratitude for the detailed explanation on Futures.

		[Reply](#comment-12802)

						Karthik Rangappa says:		

			[May 5, 2015 at 5:11 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-12848)		

Most welcome 🙂

		[Reply](#comment-12848)

						JEGANNATHAN AROCKIAM says:		

			[May 18, 2019 at 9:52 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-80425)		

Dear Karthik,

With respect to 4.4, advantage of leveraging you mentioned that  more leveraging means ( i.e less margin amount) more risk of loosing capital when the stock price come down marginally. My question is if we loose capital, the amount also will be lesser, instead of 41335 we loose 7000 only.  Moreover, why we loose that amount why not wait for increase in stock price? ( I mean within contract period) 

Please elaborate.

Thanks

						Karthik Rangappa says:		

			[May 19, 2019 at 9:48 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-80445)		

The futures work on an M2M basis, so the funds have to be settled on a daily basis. This means the capital has to go out from your account on an at the end of the day (in case of a loss). Yes, you can hold the futures position for recovery but then you need enough money to fund M2M losses (if any).

						sushil 12 says:		

			[January 14, 2015 at 9:32 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7450)		

Simple and easy. Too Good Sir:)

		[Reply](#comment-7450)

						Karthik Rangappa says:		

			[January 14, 2015 at 10:47 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-7454)		

Thx 🙂

		[Reply](#comment-7454)

						pops says:		

			[August 13, 2018 at 8:57 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65105)		

		You are simply owsum, in a short exp, you just understand us everything which was a question for lifetime , great ,
??

		[Reply](#comment-65105)

						Karthik Rangappa says:		

			[August 13, 2018 at 9:02 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-65108)		

Happy learning 🙂

		[Reply](#comment-65108)

						Shrirang Sarnaik says:		

			[September 2, 2018 at 12:08 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-66280)		

Sir I am very beginner to future stock market&#8230;Till not taken  single trade in equity future. I have one query&#8230;.are future contracts also getting highlighted in Demat or it takes a couple of days&#8230;Pls clarify

		[Reply](#comment-66280)

						Karthik Rangappa says:		

			[September 3, 2018 at 9:20 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-66353)		

No, these contracts don\'t come to DEMAT like stocks.

		[Reply](#comment-66353)

						Shantanu says:		

			[September 16, 2018 at 10:04 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-67277)		

Hi, If Future contracts dont come to demat how can see what profit or loss we have made from it ? Another query I have is , in Key points you have stated \"Spot market transactions are not leveraged, we can transact to the extent of the capital that we have\" but we get leverage depending on the volatility of the stock. Can you please explain this stmt.

Thanks,
Shantanu

						Karthik Rangappa says:		

			[September 17, 2018 at 1:10 pm](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-67317)		

The P&L can be tracked from the position\'s tab on Kite. Shantanu, can you please give me more clarity on the line \"but we get leverage depending on the volatility of the stock\". Thanks.

						Nagesh Cavatur says:		

			[January 15, 2019 at 10:31 am](https://zerodha.com/varsity/chapter/leverage-payoff/#comment-73976)		

The leverage is the reciprocal of margin percentage x 100. In the TCS example it becomes (1/14)x100 = 7.14.

		[Reply](#comment-73976)

### Leave a Reply [Cancel reply](/varsity/chapter/leverage-payoff/#respond)

Your email address will not be published. Required fields are marked *

Comment * 

Name * 

Email * 

Website 

 Save my name, email, and website in this browser for the next time I comment.

&#916;

	(function() {
		document.querySelector(".chapter-toggle").onclick = () => {
			var el = document.querySelector(".chapter-sidebar");
			if (el.classList.contains("visible")) {
				el.classList.remove("visible");
			} else {
				el.classList.add("visible");
			}
		};
	})();

					 &copy; 2015 &ndash; 2026.
					All rights reserved.
					Reproduction of the Varsity materials, text and images,
					is not permitted. For media queries, contact [[email&#160;protected]](/cdn-cgi/l/email-protection#09797b6c7a7a49736c7b666d6168276a6664)  

![Download on Play store](https://zerodha.com/varsity/wp-content/themes/varsity2//images/playstore.png)

![Download on App store](https://zerodha.com/varsity/wp-content/themes/varsity2//images/appstore.png)

{"prefetch":[{"source":"document","where":{"and":[{"href_matches":"/varsity/*"},{"not":{"href_matches":["/varsity/wp-*.php","/varsity/wp-admin/*","/varsity/wp-content/uploads/*","/varsity/wp-content/*","/varsity/wp-content/plugins/*","/varsity/wp-content/themes/varsity2/*","/varsity/*\\?(.+)"]}},{"not":{"selector_matches":"a[rel~=\"nofollow\"]"}},{"not":{"selector_matches":".no-prefetch, .no-prefetch a"}}]},"eagerness":"conservative"}]}

{"baseUrl":"https://s.w.org/images/core/emoji/17.0.2/72x72/","ext":".png","svgUrl":"https://s.w.org/images/core/emoji/17.0.2/svg/","svgExt":".svg","source":{"concatemoji":"https://zerodha.com/varsity/wp-includes/js/wp-emoji-release.min.js?ver=6.9"}}

/* e===a[t])}function p(e,t){e.clearRect(0,0,e.canvas.width,e.canvas.height),e.fillText(t,0,0);var n=e.getImageData(16,16,1,1);for(let e=0;e{s[e]=t(o,e,n,a)}),s}function r(e){var t=document.createElement("script");t.src=e,t.defer=!0,document.head.appendChild(t)}a.supports={everything:!0,everythingExceptFlag:!0},new Promise(t=>{let n=function(){try{var e=JSON.parse(sessionStorage.getItem(o));if("object"==typeof e&&"number"==typeof e.timestamp&&(new Date).valueOf(){i(n=e.data),r.terminate(),t(n)})}catch(e){}i(n=f(s,u,c,p))}t(n)}).then(e=>{for(const n in e)a.supports[n]=e[n],a.supports.everything=a.supports.everything&&a.supports[n],"flag"!==n&&(a.supports.everythingExceptFlag=a.supports.everythingExceptFlag&&a.supports[n]);var t;a.supports.everythingExceptFlag=a.supports.everythingExceptFlag&&!a.supports.flag,a.supports.everything||((t=a.source||{}).concatemoji?r(t.concatemoji):t.wpemoji&&t.twemoji&&(r(t.twemoji),r(t.wpemoji)))});
//# sourceURL=https://zerodha.com/varsity/wp-includes/js/wp-emoji-loader.min.js
/* ]]> */

  var _paq = window._paq = window._paq || [];
  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u="//m.zerodha.com/";
    _paq.push(['setTrackerUrl', u+'js/']);
    _paq.push(['setSiteId', '5']);
    _paq.push(['setAPIUrl', u]);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=u+'js/'; s.parentNode.insertBefore(g,s);
  })();

  (() => {
  	document.querySelector("#burger").onclick = (e) => {
  		e.preventDefault();
  		const el = document.querySelector("#header .menu");
  		el.style.display = el.style.display == "block" ? "none" : "block";
  	};
  })();

---

**Navigation:**  
[← Previous](./03-*.md) | [Table of Contents](./README.md) | [Next →](./05-*.md)
