#!/bin/bash
#enter input encoding here
FROM_ENCODING="GB2312"
#output encoding(UTF-8)
TO_ENCODING="UTF-8"
#convert
CONVERT=" iconv  -f   $FROM_ENCODING  -t   $TO_ENCODING"
#loop to convert multiple files 
for  file  in  *.txt; do
     $CONVERT   "$file"   "$file"   >  "../${file}"
done
exit 0