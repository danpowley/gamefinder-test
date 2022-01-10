node_modules/.bin/lessc lfg2.less public/lfg2.css
npx tsc typescript/*.ts --outfile public/lfg2.js
rm -r public/axios
cp -r node_modules/axios/dist public/axios