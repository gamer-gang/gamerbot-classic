FROM node:14-buster

ENV DOCKER=true

# install yarn + dependencies
RUN curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt update && apt -y install yarn ffmpeg \
  # node-canvas deps
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

WORKDIR /app

# bare minimum to install deps
COPY package.json .yarnrc.yml yarn.lock .pnp.js ./
COPY .yarn .yarn

RUN yarn

# bare minimum to build
COPY webpack.config.ts .eslintrc.json tsconfig.json ./
COPY src src
# needed for version info
COPY .git .git

RUN yarn build:prod

# copy everything else
COPY . .

CMD [ "yarn", "start:prod" ]
