# Entities

Entities whose data will be shown

1. Retail User
   1. Just one person's wealth, debt, trades, etc
2. Family
   1. Retail users can create families to create a grouped wealth dashboard
   2. Add family members and their data will also reflect (the family owner can manually add other family member's data also. But they need an account and should accept the invite)
   3. Can also add multiple sub families (Parents, Brother and family, My family, Sister's) and can track all in one and or just one sub family
   4. Others
3. Business or Corporates
   1. Can track their data (create account as business type). Works like the family but each account will have to be the type Business or Corporate
   2. Create sub branches or departments (like sub families)
   3. Others

These is achieved using multi tenancy of better-auth. Feature is internally named as portfolio groups or workspace. Based on the type of the portfoliogroup/workspace the other information changes. Family can be an organization and subfamily can be the teams. Role based access based on organization members and team (entirely)

# Features Planned

## Main Classifications

1. Personal Finance Management
2. Algorithm Trading

## Sub Classifications

1. Track Net Worth and Liabilities
   1. Add Data (Manual/Documents/API/Others)
      1. Investments (including tracking SIPs and tracking the current value, invested amount, etc)
         1. Stocks
         2. Mutual Funds
         3. Bonds
            1. NCD
            2. T-Bill
            3. Govt. Bonds
            4. SDL
            5. Others
         4. Physical
            1. Gold
            2. Silver
            3. Assets
               1. Vehicles
               2. Properties
               3. Electronics
               4. Cash
               5. Others
            4. Others
         5. Debt
            1. Fixed Deposit
            2. Recurring Deposit
            3. Bank Accounts
            4. Retirement Plan Bonds (etc)
            5. Others
         6. NPS
         7. EPF
         8. Cryptocurrency
         9. Others
      2. Loans and others
         1. EMIs
         2. Credit Cards
         3. Loans
            1. Home
            2. Vehicle
            3. Personal
            4. Others
         4. Others
      3. Insurance
         1. Term
         2. Life
         3. Health
         4. Vehicle
         5. Others
      4. Trading
         1. Stocks
         2. Crypto
         3. Futures and Options
         4. Currency
         5. Commodity
         6. Others
      5. Lending out money to friends and family (let user add family and friends for this feature)
      6. Others
   2. Find the projections
   3. Analyze the trends
   4. Find weak decisions
   5. Create Rebalance plans
   6. Find better options
   7. Create a plan for the future (for investments, insurances, loans, etc)
      1. For example, when getting lumpsum, keep prepaying for this loan, instead of these investments, to reduce the loss by interest, etc
      2. And others
   8. Others
2. Expense Management
   1. Let user upload bank account and credit card statements (several) to map them to their expenses, investments, SIPs, loan repayments, EMIs, Insurance premiums, NPS payments, etc
   2. Or manually add those
   3. Or fetch from bank api
   4. Based on the inputs, map those to already added assets, etc or create new
   5. Identify where the expenses going, analytics, and how to save money, etc
   6. Investment tips, proper management
   7. Others
3. Planning and Experiments
   1. Create and manage goals
      1. Map investments and loans to goals
      2. Track the prepayment or reaching the investment amount goal
      3. Can link goals with plans
      4. Goals on making the money (or taking loan and paying them). Give proper decisions based on the returns etc (investment+goal or taking savings, etc)
      5. Others
   2. Create Plans
      1. For example a trip/marriage/function, etc
         1. Map transactions, investments, loans, etc to each plans
         2. Create a day by day (time based) money ledger (for transactions)
         3. Can map things to each item in the list (for example, location, notes, possible transaction => and when it actually happens, link it)
         4. Comparisons for each item.
            1. For example, the item is selection of a hotel to stay for few particular days
            2. Let user create a comparison item there and add several hotels
            3. Add their information in that (use predefined fields based on the type at first and let user add custom fields) and add weightage for each of these fields (generate a weightage at first by AI which can be modified by the user)
            4. With these field values and price, location, etc let the AI compare and comeup with a winner. And the user can also rate each of the fields of each items and come up with the winner based on calculating scores
            5. And others
         5. Another Comparison is of Passes
            1. Transport Passes, Attraction Passes, etc
            2. Compare those with the cost it could be if the user bought tickets/items separately
            3. Let the user add all the items manually at first
            4. And also let user add passes valid for the trip (time constraints -> 5 days, etc. Invalidities/Validities -> valid only on every weekdays, invalid on this train/attraction, etc)
            5. And then based on the itinerary, select the best pass, or validate if the pass is worth it or not. Or suggest alternative activation dates for maximum savings.
            6. Let user add different variants of the pass (different days, or a premium variant which includes a certain attraction, etc)
            7. Other features
         6. Another Comparison can be Flights/Transport Options
            1. Let user add several flights/transport options (each of the transport option may contain several types or different legs. But treat as one. Tokyo to Osaka -> Local train + Flight. cost, time, layovers, etc)
            2. Compare and take the winner
            3. others
         7. Others
      2. Legacy Planning
         1. Send all the information of investments or debts to close ones if the user is inactive for a specified time and no response with login options for them
         2. Others
      3. Other plans we could add (like retirement plan)
   3. Create Experiments
      1. For example in investment
         1. Try investing in crypto (link the transaction or add one)
         2. Mark how it went
         3. Also can create a planning or learning investment (where the amount and transaction can be fake with no real money)
      2. Trading
         1. Try out different strategies
         2. real or fake
      3. Analytics and insights on those experiments
   4. Others
4. Algorithm Trading
   1. Configurable by granular level
      1. Losses
      2. Max limit
      3. instruments
      4. types (intraday, sell, buy, etc)
      5. strategies
      6. days, etc
      7. others
   2. kill switch
   3. analytics
   4. insights
   5. AI can also create experiments on new strategies in which the user can participate
   6. others
