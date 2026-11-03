#!/usr/bin/env bash
# Собирает _site: последний релиз в корне, текущий master в next/, прошлые релизы в v/<версия>/.
# Список версий для сайта — versions.json в корне, от самой новой к старым
set -euo pipefail

# assemble <коммит или тег> <папка>
assemble() {
  local ref="$1" out="$2" src
  src="$(mktemp -d)"
  git archive "$ref" | tar -x -C "$src"
  mkdir -p "$out/about"
  if [ -d "$src/frontend" ]; then
    cp -r "$src/frontend/." "$out/"
  else
    # В старых релизах приложение лежит в корне репозитория, а не в frontend/
    (cd "$src" && cp -r index.html demo.html app.js styles.css fonts.css favicon.ico manifest.webmanifest assets "$OLDPWD/$out/")
  fi
  cp -r "$src/docs/." "$out/about/"
  # Версия в адресах стилей и скрипта: браузер не покажет новую разметку со старыми файлами из кеша
  local v
  v="$(git rev-parse --short=7 "$ref^{commit}")"
  sed -i -E "s#(styles\.css|fonts\.css)\"#\1?v=$v\"#; s#app\.js\?v=[0-9a-z]+#app.js?v=$v#" "$out/index.html"
  grep -n "?v=" "$out/index.html"
  rm -rf "$src"
}

mapfile -t tags < <(git tag --list 'v*' --sort=-v:refname)
if [ "${#tags[@]}" -eq 0 ]; then
  echo "Нет ни одного тега v*: основному сайту нечего показывать" >&2
  exit 1
fi
release="${tags[0]}"
echo "Основной сайт: $release, предпросмотр: $(git rev-parse --short=7 master)"

rm -rf _site
mkdir _site
assemble "$release" _site
assemble master _site/next

versions="{\"label\":\"Предпросмотр\",\"note\":\"новее ${release#v}\",\"path\":\"next/\"},{\"label\":\"${release#v}\",\"note\":\"актуальная\",\"path\":\"\"}"
for tag in "${tags[@]:1}"; do
  name="${tag#v}"
  assemble "$tag" "_site/v/$name"
  # В старых версиях может не быть списка версий, поэтому оставляем дорогу обратно
  sed -i "s#</body>#<a href=\"../../\" style=\"position:fixed;z-index:1000;left:50%;bottom:12px;transform:translateX(-50%);padding:8px 14px;border-radius:999px;background:\#ffdf6b;color:\#22221f;font:600 13px system-ui,sans-serif;text-decoration:none;white-space:nowrap\">Версия $name · К актуальной</a></body>#" "_site/v/$name/index.html"
  versions="$versions,{\"label\":\"$name\",\"note\":\"\",\"path\":\"v/$name/\"}"
done
echo "[$versions]" > _site/versions.json
cat _site/versions.json
du -sh _site

touch _site/.nojekyll
