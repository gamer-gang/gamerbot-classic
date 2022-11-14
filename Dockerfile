FROM node:18-buster AS build

ENV DOCKER=true

# install yarn + dependencies
RUN curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt update && apt -y install yarn

WORKDIR /app

COPY package.json .yarnrc.yml yarn.lock .pnp.cjs ./
COPY packages/common/package.json packages/common/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/util/package.json packages/util/package.json
COPY .yarn .yarn

RUN yarn --inline-builds

COPY . .

RUN yarn workspaces foreach -ptv --no-private run build

FROM node:18-buster

# install yarn + dependencies
RUN curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt update && apt -y install \
  yarn \
  ffmpeg \
  figlet \
  # node-canvas deps
  libcairo2-dev \
  libgif-dev \
  libjpeg-dev \
  libpango1.0-dev \
  librsvg2-dev

WORKDIR /app

COPY --from=build /app/assets assets
COPY --from=build /app/package.json /app/.yarnrc.yml /app/yarn.lock /app/.pnp.cjs ./
COPY --from=build /app/.yarn .yarn
COPY --from=build /app/packages/core/package.json /app/packages/core/package.json
COPY --from=build /app/packages/core/dist /app/packages/core/dist

CMD [ "yarn", "workspace", "@gamerbot/core", "prod" ]
