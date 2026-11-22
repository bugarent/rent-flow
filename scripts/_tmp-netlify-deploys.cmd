@echo off
npx netlify api listSiteDeploys --data "{\"site_id\":\"987a8e55-1028-4fef-acfd-63934ca1589c\"}" > "%~dp0_tmp-deploys-raw.json" 2> "%~dp0_tmp-deploys-err.txt"
