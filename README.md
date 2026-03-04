<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a name="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<!-- PROJECT LOGO -->
<br />

<div align="center">
  <h3 align="center">HopShare</h3>

  <p align="center">
    A community-based ridesharing coordination platform for Johns Hopkins University students.
    <br />
    <a href="https://github.com/jhu-oose-sp26/HopShare"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/jhu-oose-sp26/HopShare/issues">Report Bug</a>
    ·
    <a href="https://github.com/jhu-oose-sp26/HopShare/issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

Hop-Share was created to address a common challenge faced by Hopkins students: transportation. Because undergraduates are generally discouraged from bringing cars to campus and have limited parking access, many students rely on expensive ride-hailing services or inconvenient public transportation.

Hop-Share provides a practical and community-driven solution. It is a web-based platform where JHU students can coordinate shared rides based on destination, time, and preferences. Instead of a traditional ride-hailing service, the app operates a forum-like platform where students can post ride requests or offer rides to others heading in the same direction.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Node.js][Node.js]][Node-url]
* [![Express][Express]][Express-url]
* [![MongoDB][MongoDB]][MongoDB-url]
* [![Vite][Vite]][Vite-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

Follow the steps below to get a local copy of HopShare up and running.

### Prerequisites

* pnpm (recommended) or npm
  ```sh
  npm install -g pnpm
  ```
* [MongoDB Community Edition](https://www.mongodb.com/try/download/community) (install Compass when prompted)
* A free [SerpAPI](https://serpapi.com/users/sign_up?plan=free) account for your API key

### Installation

#### Backend

1. Navigate to the backend directory
   ```sh
   cd backend
   ```
2. Install dependencies
   ```sh
   pnpm install
   ```
3. Create a `.env` file using `.env.example` as a template and fill in your credentials (MongoDB URI, SerpAPI key, etc.)
4. Start a local MongoDB server using Compass or the MongoDB shell (default localhost)
5. Start the backend server
   ```sh
   pnpm start
   ```

#### Frontend

1. Open a new terminal and navigate to the frontend directory
   ```sh
   cd frontend
   ```
2. Install dependencies
   ```sh
   pnpm install
   ```
3. Start the development server
   ```sh
   pnpm dev
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

With HopShare, JHU students can:

- Log in using their Johns Hopkins University credentials
- Post ride requests for specific destinations and times
- Offer rides if they own a car and want to share costs
- Browse and filter available ride posts
- Communicate securely within the app to coordinate logistics

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] User authentication with JHU credentials
- [x] Post and browse ride requests
- [x] Offer rides and match with riders
- [x] In-app messaging for ride coordination
- [ ] Mobile-responsive design improvements
- [ ] Ride history and ratings
- [ ] Push notifications for ride matches

See the [open issues](https://github.com/jhu-oose-sp26/HopShare/issues) for a full list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

**Team Members:**

| Name | GitHub |
|------|--------|
| Han Lim | [@hansl404](https://github.com/hansl404) |
| Louis Hu | [@FengqiHu](https://github.com/FengqiHu) |
| Junzhe Shi | [@JunzheShi0702](https://github.com/JunzheShi0702) |
| Immanuel | [@finr0y](https://github.com/finr0y) |
| Janna Ibrahim | [@jannaibrahim25](https://github.com/jannaibrahim25) |

Project Link: [https://github.com/jhu-oose-sp26/HopShare](https://github.com/jhu-oose-sp26/HopShare)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
* [SerpAPI](https://serpapi.com)
* [MongoDB](https://www.mongodb.com)
* [Vite](https://vitejs.dev)
* [Img Shields](https://shields.io)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/jhu-oose-sp26/HopShare.svg?style=for-the-badge
[contributors-url]: https://github.com/jhu-oose-sp26/HopShare/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/jhu-oose-sp26/HopShare.svg?style=for-the-badge
[forks-url]: https://github.com/jhu-oose-sp26/HopShare/network/members
[stars-shield]: https://img.shields.io/github/stars/jhu-oose-sp26/HopShare.svg?style=for-the-badge
[stars-url]: https://github.com/jhu-oose-sp26/HopShare/stargazers
[issues-shield]: https://img.shields.io/github/issues/jhu-oose-sp26/HopShare.svg?style=for-the-badge
[issues-url]: https://github.com/jhu-oose-sp26/HopShare/issues
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Node.js]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[Node-url]: https://nodejs.org/
[Express]: https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white
[Express-url]: https://expressjs.com/
[MongoDB]: https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white
[MongoDB-url]: https://www.mongodb.com/
[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
