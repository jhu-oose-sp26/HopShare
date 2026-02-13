# **Hop-Share Software Requirement Specification**

## **Problem Statement**

Hopkins is known to have a “bubble,” especially for undergraduates. A lot of that is due to Hopkins not providing regular parking options to undergrads as they do for graduate students and faculty members. Hopkins discourages undergraduates bringing / using their cars on campus, and thus, most of these students have to rely on expensive Uber / Lyft rides, limited destination Hopkins shuttles, and nearly unusable public transportation.

We are trying to provide a way for students who want to use the convenience of ridehail services like Uber and Lyft without the enormous cost, as well as give students an opportunity to make some easy money on the side driving other Hopkins students.

## **Potential Clients**

Hopkins students, primarily undergraduates, but also graduate students, who don’t have cars and where waiting for the bus would be too long/inconvenient, but taking a normal ridehail would be too expensive

Hopkins students who want to make some extra money on the side for driving to places they would normally go, and working for Uber/Lyft is too much of a time commitment

Hopkins students who’d feel more comfortable sharing a ride with someone in the Hopkins circle than a complete stranger.

## **Proposed Solution**

In general, we create a shared app specifically for JHU students to find available ridesharing requests based on destination, route preferences, time, budget, and social habits. The app will be like a forum where people looking for a ride can input their desired destination, or browse existing plans that potential riders have posted. The app will make it easy for users to find shared desired destinations and contact those who want to go to a similar place at a similar time so they can split the rideshare costs. Search will be made easier with filtering/sorting within time range. Additionally, users can upload posts that indicate themself as the driver so they can potentially make money on a drive they were going to do anyways.

## **Functional Requirements**

### **Must have**

1. As a Hopkins student, I would login with my JHU student account, so I can be freed from tedious registration process of personal email address and verification of “I am a Hopkins student”
2. As a user of the app, I would like to be able to publish my post so that the Hopkins community can view it and I can potentially get a ridesharer.
3. As a person who want to find someone to share a ride, I want to get contact with the partner ahead of time by finding them on a forum, so we could confirm the point of meeting and negotiate the payments earlier to avoid the potential conflicts.
4. As a Hopkins student who could provide cheaper price of ride-share, I want this platform to allow me to register as a student driver, so I can benefit students by saving their money from taking my car rather than expensive Uber or Lyft
5. As a person who book a drive on different purposes, including booked-ahead ride share to airport and instantly needed ride share, I want to have two types of rides being classified well with tags so I could search for the drive desired more effectively.
6. As a client of HopShare, I would like to complete all of my connections in a secure private chat window integrated in the app with security verification, so I will be less likely to be exposed to scamming and cheating.

### Nice to have

1. As an app user, I want the mobile app version or at least mobile-friendly version be provided so I can use this app anywhere and anytime
2. As a client of HopShare, I would like to create group chats, so that all members of a multi-member rideshare are in sync in communication.
3. As a student using HopShare with my friends, I want add my friend to my friend list in the app and also be able to by viewing their ride-share requests so they can also enjoy more economic ride share with me, save more for everyone of us.
4. As a student using HopShare, I want the feature that could set the request to only visible to my friend, so I can share ride with people I trust more and avoid uncomfortable interaction with strangers even within Hopkins.

## **Non-functional Requirements**

1. Everything loads within 1 second
2. Encrypt any sensitive data
3. Ease of use/navigation of the site

## **Software Architecture & Technology Stack**

This will primarily be a web app

The tech stack will be: 

- Frontend: React, TypeScript, Next.js
- Backend: Node.js, Express
- Database: SQLite using Django
- Deployment: Vercel



## Similar Apps

- Existing similar apps are Uber and Lyft because they have to do with transportation around Baltimore/campus
- Our app is different because it is more of a forum to coordinate rides rather than an algorithm determining the driver and path. There is no payment or navigation algorithm within the app. Once students connect with each other, it is up to them to hail the ride and split the costs.
- Our app is restricted towards Hopkins students (requires a Hopkins login)
- UberX’s existing Share / Pool feature allows only 1 passenger per request and shares with up to 2 other people, but our app gives riders the freedom to join solo members/groups with other solo members/groups per ride with as many riders as can permissibly fit in a given vehicle, for potentially larger savings.